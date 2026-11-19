const stageData = [
  { title: 'Great places.<br>Built from<br>the ground up.', description: 'Before the first key turns, every detail matters.<br>Scroll to see a place come to life.', accessible: 'Groundwork: excavators, a backhoe loader and a tipper truck prepare the full Knightswood Estate site.' },
  { title: 'Everything rests<br>on a strong<br>foundation.', description: 'Precision beneath the surface.<br>The groundwork for everything that follows.', accessible: 'Foundations: concrete mixers and workers pour foundations across the six apartment blocks and eight duplex pairs.' },
  { title: 'A vision.<br>Taking shape.', description: 'Column by column. Floor by floor.<br>The structure begins to tell its story.', accessible: 'Structure: a tower crane and delivery trucks help erect the apartment and duplex structures.' },
  { title: 'Reaching<br>new heights.', description: 'Roof by roof. The defining silhouette.<br>A new place on the skyline.', accessible: 'Roof: all six four-storey apartment blocks and the two-storey duplex pairs reach roof level, with roof sheeting being installed.' },
  { title: 'Character.<br>In every detail.', description: 'Cream plaster. Charcoal frames. Sheltered balconies.<br>Materials bring the architecture to life.', accessible: 'Façade: cream plaster, charcoal paint and glazing are installed, with scaffolding remaining for the final work.' },
  { title: 'From a site.<br>To somewhere<br>called home.', description: 'The final touches make all the difference.<br>Knightswood Estate, ready for its next chapter.', accessible: 'Finishing: the full estate is complete, with landscaped gardens, paved access and parked cars.' },
];

// Set to a local, seek-optimized MP4 when continuous construction footage is available.
// The supplied experience uses six generated photographic keyframes.
const CONSTRUCTION_VIDEO = null;
const story = document.querySelector('.construction-story');
const sticky = document.querySelector('.story-sticky');
const frames = [...document.querySelectorAll('.scene-frame')];
const chapters = [...document.querySelectorAll('.chapter')];
const title = document.querySelector('#chapter-title');
const description = document.querySelector('#chapter-description');
const sceneDescription = document.querySelector('#scene-description');
const progressLabel = document.querySelector('#progress-label');
const playButton = document.querySelector('#play-build');
const playLabel = document.querySelector('#play-label');
const video = document.querySelector('.construction-film');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionQuery.matches;
let progress = 0;
let displayedStage = -1;
let scheduled = false;
let playing = false;
let autoplayFrame = 0;
let storyStart = 0;
let storyLength = 1;
let videoReady = false;
let wantedVideoTime = 0;

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => value * value * (3 - 2 * value);

function measure() {
  storyStart = story.getBoundingClientRect().top + window.scrollY;
  storyLength = Math.max(1, story.offsetHeight - sticky.offsetHeight);
  scheduleRender();
}

function seekVideo() {
  if (!videoReady || video.seeking || !Number.isFinite(video.duration)) return;
  if (Math.abs(video.currentTime - wantedVideoTime) > .035) {
    video.currentTime = wantedVideoTime;
  }
}

function render() {
  scheduled = false;
  progress = clamp((window.scrollY - storyStart) / storyLength);
  // First and final stages have breathing room; each chapter is fully visible
  // at its button's destination. Scrolling backwards reverses the same blend.
  const position = progress * 5;
  const base = Math.min(5, Math.floor(position));
  const fraction = position - base;
  const blend = reducedMotion ? (fraction >= .5 ? 1 : 0) : smooth(clamp((fraction - .24) / .52));
  const stage = Math.min(5, Math.floor(position + .5));
  if (!playing) playLabel.textContent = progress > .985 ? 'Replay the build' : 'Play the build';
  frames.forEach((frame, index) => {
    // The earlier frame remains opaque behind the next to prevent dark flashes.
    frame.style.opacity = index === base ? '1' : index === base + 1 ? String(blend) : '0';
    if (!reducedMotion && (index === base || index === base + 1)) {
      frame.style.transform = 'none';
    }
  });
  chapters.forEach((chapter, index) => {
    chapter.querySelector('i').style.transform = `scaleX(${clamp(position - index + 1)})`;
  });
  if (stage !== displayedStage) {
    displayedStage = stage;
    title.innerHTML = stageData[stage].title;
    description.innerHTML = stageData[stage].description;
    sceneDescription.textContent = stageData[stage].accessible;
    progressLabel.textContent = `${String(stage + 1).padStart(2, '0')} / 06`;
    chapters.forEach((chapter, index) => {
      chapter.classList.toggle('is-active', index === stage);
      if (index === stage) chapter.setAttribute('aria-current', 'step');
      else chapter.removeAttribute('aria-current');
    });
  }
  if (videoReady) {
    wantedVideoTime = progress * Math.max(0, video.duration - .04);
    seekVideo();
  }
}

function scheduleRender() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(render); }
}

function stopPlayback() {
  playing = false;
  cancelAnimationFrame(autoplayFrame);
  playLabel.textContent = progress > .985 ? 'Replay the build' : 'Play the build';
  playButton.setAttribute('aria-pressed', 'false');
}

function goToStage(stage) {
  stopPlayback();
  window.scrollTo({ top: storyStart + storyLength * stage / 5, behavior: reducedMotion ? 'instant' : 'smooth' });
}

chapters.forEach((chapter, index) => chapter.addEventListener('click', () => goToStage(index)));
document.querySelector('#replay-build').addEventListener('click', () => {
  goToStage(0);
  chapters[0].focus({ preventScroll: true });
});

playButton.addEventListener('click', () => {
  if (playing) { stopPlayback(); return; }
  if (reducedMotion) return;
  const startProgress = progress > .985 ? 0 : progress;
  const duration = Math.max(2000, (1 - startProgress) * 22000);
  const startTime = performance.now();
  playing = true;
  playLabel.textContent = 'Pause the build';
  playButton.setAttribute('aria-pressed', 'true');
  function tick(time) {
    if (!playing) return;
    const elapsed = clamp((time - startTime) / duration);
    window.scrollTo({ top: storyStart + storyLength * (startProgress + elapsed * (1 - startProgress)), behavior: 'instant' });
    if (elapsed < 1) autoplayFrame = requestAnimationFrame(tick);
    else stopPlayback();
  }
  autoplayFrame = requestAnimationFrame(tick);
});

// Native scrolling is preserved. User input always takes control from playback.
window.addEventListener('wheel', stopPlayback, { passive: true });
window.addEventListener('touchstart', event => {
  if (!playButton.contains(event.target)) stopPlayback();
}, { passive: true });
window.addEventListener('keydown', event => {
  if (event.key === ' ' && playButton.contains(event.target)) return;
  if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', 'Home', 'End', 'Escape', ' '].includes(event.key)) stopPlayback();
});
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', stopPlayback));
window.addEventListener('scroll', scheduleRender, { passive: true });
window.addEventListener('resize', measure, { passive: true });
window.addEventListener('pageshow', measure);
motionQuery.addEventListener('change', event => {
  reducedMotion = event.matches;
  stopPlayback();
  measure();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
new ResizeObserver(measure).observe(story);

if (CONSTRUCTION_VIDEO) {
  video.src = CONSTRUCTION_VIDEO;
  video.preload = 'auto';
  video.addEventListener('loadeddata', () => {
    if (Number.isFinite(video.duration)) {
      videoReady = true;
      video.classList.add('is-ready');
      scheduleRender();
    }
  });
  video.addEventListener('seeked', seekVideo);
  video.addEventListener('error', () => {
    videoReady = false;
    video.classList.remove('is-ready');
  });
}

// Decode ahead of scrolling. The first photograph is prioritized by the browser.
frames.forEach(frame => { if (frame.decode) frame.decode().catch(() => {}); });

measure();
