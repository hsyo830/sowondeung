// 게임 오디오 재생부 (브라우저 Web Audio API, 추가 패키지 없음). React 컴포넌트가 아니라 모듈 하나가 소유하는 싱글턴이라
// 모달을 열고 닫거나 HUD가 다시 렌더링되어도 BGM·모닥불 소리가 다시 시작되지 않는다.
// 무엇을 언제 재생할지는 soundRules(순수 함수)와 연결 컴포넌트(components/audio)가 정하고, 여기는 소리를 내는 일만 한다.
//
// 연결 구조
//   BGM:      <audio>(스트리밍, loop) → bgmFade(처음 페이드 인) → bgmChannel(설정 볼륨) ─┐
//   모닥불:   AudioBuffer(loop 구간) → campfireGain(근접도) ──────────────────┐            ├→ destination
//   효과음:   AudioBuffer(1회) → 개별 gain ─────────────────────────────────── sfxChannel ─┘
//
// 자동 재생 정책: AudioContext는 사용자 입력(클릭·키) **안에서** unlock()이 처음 만든다. 입력 전에는 만들지 않으므로
// 'AudioContext was not allowed to start' 경고가 나지 않는다. 재생 Promise 거부는 모두 잡아서 처리되지 않은 오류를 남기지 않는다.

import {
  AUDIO_FILES,
  BGM_CONFIG,
  CAMPFIRE_LOOP,
  CHANNEL_GAIN_SMOOTHING_SEC,
  FOOTSTEP_CONFIG,
  FOOTSTEP_SEGMENTS,
  ONE_SHOT_CONFIG,
} from "@/constants/audio";
import type { BufferedSoundId, OneShotSoundId } from "@/constants/audio";
import { getChannelGain } from "@/lib/audio/audioSettings";
import type { AudioSettings } from "@/lib/audio/audioSettings";
import {
  canPlayAfterCooldown,
  getFootstepNormalize,
  getJitter,
  pickFootstepIndex,
} from "@/lib/audio/soundRules";

const BUFFERED_SOUND_IDS: readonly BufferedSoundId[] = [
  "uiClick",
  "paper",
  "ignite",
  "launch",
  "footstep",
  "campfire",
];
/** 디코딩용 샘플레이트. 실제 출력 장치와 다르면 재생할 때 브라우저가 변환한다 */
const DECODE_SAMPLE_RATE = 48000;
/** 이전 걸음을 끊을 때 줄이는 시간 상수 (초) */
const FOOTSTEP_CUT_SEC = 0.015;

function ignore(): void {}

interface FootstepVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  endsAt: number;
}

/** AudioContext 하나에 딸린 노드. unlock()에서 만들고 shutdown()에서 함께 버린다 */
interface AudioGraph {
  context: AudioContext;
  bgmChannel: GainNode;
  bgmFade: GainNode;
  sfxChannel: GainNode;
  campfireGain: GainNode;
  bgmElement: HTMLAudioElement | null;
  campfireSource: AudioBufferSourceNode | null;
  isBgmPlaying: boolean;
}

class AudioEngine {
  /** 디코딩한 소리. AudioBuffer는 특정 AudioContext에 묶이지 않아 다시 unlock해도 재사용한다 */
  private readonly buffers = new Map<BufferedSoundId, AudioBuffer>();
  private preloadPromise: Promise<void> | null = null;
  private graph: AudioGraph | null = null;
  private channelGains = { bgm: 0, sfx: 0 };
  private campfireProximity = 0;
  private readonly lastPlayedAt = new Map<OneShotSoundId, number>();
  private footstepVoice: FootstepVoice | null = null;
  private lastFootstepIndex: number | null = null;

  /**
   * 파일을 받아 디코딩해 둔다 (사용자 입력 전에도 가능. OfflineAudioContext는 자동 재생 제한 대상이 아니다).
   * 경로가 null인 소리(아직 파일 없음)는 요청하지 않는다. 실패한 파일은 조용히 건너뛰고 그 소리만 나지 않는다.
   */
  preload(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    let decoder: OfflineAudioContext;
    try {
      decoder = new OfflineAudioContext(2, 1, DECODE_SAMPLE_RATE);
    } catch {
      this.preloadPromise = Promise.resolve();
      return this.preloadPromise;
    }
    const loads = BUFFERED_SOUND_IDS.map(async (id) => {
      const src = AUDIO_FILES[id];
      if (!src) return;
      try {
        const response = await fetch(src);
        if (!response.ok) return;
        const buffer = await decoder.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(id, buffer);
        // 입력 후에 디코딩이 끝났으면 그때 모닥불을 켠다
        if (id === "campfire") this.startCampfire();
      } catch {
        // 네트워크·디코딩 실패: 그 소리만 재생하지 않는다
      }
    });
    this.preloadPromise = Promise.all(loads).then(ignore);
    return this.preloadPromise;
  }

  /**
   * 사용자 입력 이벤트 안에서 부른다. 처음이면 AudioContext와 노드를 만들고, BGM·모닥불을 시작한다.
   * 여러 번 불러도 같은 결과다 (이미 있으면 다시 만들지 않고, 멈춰 있으면 다시 시도만 한다).
   * @returns 오디오가 완전히 켜졌는가 (컨텍스트 실행 중 + BGM 재생 중). false면 다음 입력에서 다시 부른다
   */
  unlock(): boolean {
    const graph = this.graph ?? this.createGraph();
    if (!graph) return false;
    if (graph.context.state === "suspended") graph.context.resume().catch(ignore);
    this.startBgm(graph);
    this.startCampfire();
    return graph.context.state === "running" && (graph.bgmElement === null || graph.isBgmPlaying);
  }

  /** 설정 볼륨 반영. 슬라이더를 움직이는 즉시 따라가되, 짧게 보간해 '틱' 소리가 나지 않게 한다 */
  applySettings(settings: AudioSettings): void {
    this.channelGains = { bgm: getChannelGain(settings.bgm), sfx: getChannelGain(settings.sfx) };
    const graph = this.graph;
    if (!graph) return;
    const now = graph.context.currentTime;
    graph.bgmChannel.gain.setTargetAtTime(
      this.channelGains.bgm * BGM_CONFIG.gain,
      now,
      CHANNEL_GAIN_SMOOTHING_SEC,
    );
    graph.sfxChannel.gain.setTargetAtTime(this.channelGains.sfx, now, CHANNEL_GAIN_SMOOTHING_SEC);
  }

  /** 모닥불 근접도 (0~1). 매 프레임 불려도 목표값만 바꾸고, 실제 음량은 smoothingSec 동안 따라간다 */
  setCampfireProximity(proximity: number): void {
    this.campfireProximity = proximity;
    const graph = this.graph;
    if (!graph || !graph.campfireSource) return;
    graph.campfireGain.gain.setTargetAtTime(
      proximity * CAMPFIRE_LOOP.maxGain,
      graph.context.currentTime,
      CAMPFIRE_LOOP.smoothingSec,
    );
  }

  /** 1회 효과음. cooldown 안의 재요청(연타·같은 이벤트 중복)은 무시한다 */
  playOneShot(id: OneShotSoundId): void {
    const graph = this.getRunningGraph();
    const buffer = this.buffers.get(id);
    if (!graph || !buffer) return;
    const config = ONE_SHOT_CONFIG[id];
    const nowMs = performance.now();
    if (!canPlayAfterCooldown(this.lastPlayedAt.get(id) ?? null, nowMs, config.cooldownMs)) return;
    this.lastPlayedAt.set(id, nowMs);

    const { context } = graph;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = config.gain;
    source.connect(gain).connect(graph.sfxChannel);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(0, Math.min(config.offsetSec, buffer.duration));
  }

  /**
   * 발 디딤 한 번 (Walk 클립의 발이 닿는 순간 CharacterModel이 알린다).
   * 걸음 구간 하나만 재생한다. 앞 걸음이 아직 울리면 짧게 줄이고 끊어 겹쳐 커지지 않게 한다.
   */
  playFootstep(): void {
    const graph = this.getRunningGraph();
    const buffer = this.buffers.get("footstep");
    if (!graph || !buffer || FOOTSTEP_SEGMENTS.length === 0) return;
    const { context } = graph;
    const now = context.currentTime;

    this.cutFootstep(now);

    const index = pickFootstepIndex(
      this.lastFootstepIndex,
      FOOTSTEP_SEGMENTS.length,
      Math.random(),
    );
    this.lastFootstepIndex = index;
    const segment = FOOTSTEP_SEGMENTS[index];
    const rate = getJitter(FOOTSTEP_CONFIG.playbackRateJitter, Math.random());
    const volume =
      FOOTSTEP_CONFIG.gain *
      getFootstepNormalize(
        segment,
        FOOTSTEP_CONFIG.targetPeak,
        FOOTSTEP_CONFIG.minNormalize,
        FOOTSTEP_CONFIG.maxNormalize,
      ) *
      getJitter(FOOTSTEP_CONFIG.gainJitter, Math.random());
    // 재생 속도를 바꾸면 실제 재생 시간도 바뀐다
    const playSec = segment.durationSec / rate;
    const endsAt = now + playSec;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    // 구간 끝에서 0으로 줄인다 (잘라 낸 끝이 '틱' 하고 끊기지 않게)
    gain.gain.setTargetAtTime(
      0,
      Math.max(now, endsAt - FOOTSTEP_CONFIG.releaseSec),
      FOOTSTEP_CONFIG.releaseSec / 3,
    );
    source.connect(gain).connect(graph.sfxChannel);
    const voice: FootstepVoice = { source, gain, endsAt };
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.footstepVoice === voice) this.footstepVoice = null;
    };
    source.start(now, segment.startSec);
    source.stop(endsAt + FOOTSTEP_CONFIG.releaseSec);
    this.footstepVoice = voice;
  }

  /**
   * 오디오를 모두 멈추고 AudioContext를 닫는다 (게임 화면이 사라질 때). 디코딩한 소리는 남겨 다시 쓴다.
   * <audio>는 MediaElementSource에 한 번만 연결할 수 있어서 버리고, 다음 unlock에서 새로 만든다.
   */
  shutdown(): void {
    const graph = this.graph;
    this.graph = null;
    this.footstepVoice = null;
    if (!graph) return;
    try {
      graph.campfireSource?.stop();
    } catch {
      // 이미 멈춘 소스
    }
    if (graph.bgmElement) {
      graph.bgmElement.pause();
      graph.bgmElement.removeAttribute("src");
      graph.bgmElement.load();
    }
    graph.context.close().catch(ignore);
  }

  private createGraph(): AudioGraph | null {
    if (typeof AudioContext === "undefined") return null;
    let context: AudioContext;
    try {
      context = new AudioContext();
    } catch {
      return null;
    }
    const bgmChannel = context.createGain();
    const bgmFade = context.createGain();
    const sfxChannel = context.createGain();
    const campfireGain = context.createGain();
    bgmChannel.gain.value = this.channelGains.bgm * BGM_CONFIG.gain;
    bgmFade.gain.value = 0;
    sfxChannel.gain.value = this.channelGains.sfx;
    campfireGain.gain.value = 0;
    bgmFade.connect(bgmChannel).connect(context.destination);
    campfireGain.connect(sfxChannel);
    sfxChannel.connect(context.destination);
    this.graph = {
      context,
      bgmChannel,
      bgmFade,
      sfxChannel,
      campfireGain,
      bgmElement: null,
      campfireSource: null,
      isBgmPlaying: false,
    };
    return this.graph;
  }

  private getRunningGraph(): AudioGraph | null {
    const graph = this.graph;
    return graph && graph.context.state === "running" ? graph : null;
  }

  /**
   * BGM은 길어서(141초, 디코딩하면 약 50MB) 디코딩하지 않고 <audio>로 스트리밍한다.
   * 곡 끝 약 4초가 페이드아웃이라 loop로 처음에 돌아가도 끊김 없이 다시 시작하는 것처럼 들린다.
   * 음소거·볼륨 0이어도 멈추지 않고 gain만 0이다 → 해제하면 이어서 들린다 (다시 시작하지 않음).
   */
  private startBgm(graph: AudioGraph): void {
    const src = AUDIO_FILES.bgm;
    if (!src) return;
    if (!graph.bgmElement) {
      const element = new Audio(src);
      element.loop = true;
      element.preload = "auto";
      try {
        graph.context.createMediaElementSource(element).connect(graph.bgmFade);
      } catch {
        return;
      }
      graph.bgmElement = element;
    }
    const element = graph.bgmElement;
    if (!element.paused) return;
    element
      .play()
      .then(() => {
        if (this.graph !== graph) return;
        graph.isBgmPlaying = true;
        graph.bgmFade.gain.setTargetAtTime(1, graph.context.currentTime, BGM_CONFIG.fadeInSec);
      })
      // 자동 재생이 거부되면 다음 사용자 입력의 unlock()에서 다시 시도한다
      .catch(ignore);
  }

  /** 모닥불 반복 재생. 컨텍스트와 디코딩된 소리가 모두 준비된 쪽에서 한 번만 시작된다 */
  private startCampfire(): void {
    const graph = this.graph;
    const buffer = this.buffers.get("campfire");
    if (!graph || !buffer || graph.campfireSource) return;
    const { context } = graph;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = CAMPFIRE_LOOP.loopStartSec;
    source.loopEnd = Math.min(CAMPFIRE_LOOP.loopEndSec, buffer.duration);
    source.connect(graph.campfireGain);
    source.start(0, CAMPFIRE_LOOP.loopStartSec);
    graph.campfireSource = source;
    // 0에서 현재 근접도까지 천천히 올라온다 (갑자기 시작하지 않게)
    graph.campfireGain.gain.setTargetAtTime(
      this.campfireProximity * CAMPFIRE_LOOP.maxGain,
      context.currentTime,
      CAMPFIRE_LOOP.fadeInSec,
    );
  }

  private cutFootstep(now: number): void {
    const voice = this.footstepVoice;
    if (!voice || voice.endsAt <= now) return;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, FOOTSTEP_CUT_SEC);
    try {
      voice.source.stop(now + FOOTSTEP_CUT_SEC * 5);
    } catch {
      // 이미 멈춘 소스
    }
    this.footstepVoice = null;
  }
}

let engine: AudioEngine | null = null;

/** 오디오 엔진 싱글턴. 처음 부를 때 만든다 (모듈을 불러오는 것만으로는 브라우저 API를 건드리지 않는다 → SSR 안전) */
export function getAudioEngine(): AudioEngine {
  engine ??= new AudioEngine();
  return engine;
}

export type { AudioEngine };
