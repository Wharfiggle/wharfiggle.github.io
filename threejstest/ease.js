export function ease(currentProg, dt, goalSecs, forwards = true)
{
    let t = currentProg;
    
    //convert to linear with inverse curve function
    t = Math.pow(Math.pow(t, 2), 2);
    
    //progress by dt converted to linear
    t = t + (forwards?1:-1) * dt / 1000 / goalSecs;
    //clamp
    t = Math.max(0, Math.min(1, t));
    
    //apply curve function
    t = Math.sqrt(Math.sqrt(t));
    
    return t;
}