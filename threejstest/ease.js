export function ease(currentTime, startTime, goalSecs, forwards = true)
    {
        const t = (currentTime - startTime) / (goalSecs * 1000);
        return forwards ? t : 1 - t;
    }