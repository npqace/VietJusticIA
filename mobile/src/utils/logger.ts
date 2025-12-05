const logger = {
    debug: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    },
    info: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    error: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    },
};

export default logger;
