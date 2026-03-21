export function ease(currentProg, dt, goalSecs, forwards = true)
{
    const t = currentProg;
    let secs = t * goalSecs + ((forwards?1:-1) * dt / 1000);
    secs = Math.max(0, Math.min(goalSecs, secs));
    const newT = secs / goalSecs;
    return newT;
}