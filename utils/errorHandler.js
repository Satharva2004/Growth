/**
 * Global Error Handler for React Native
 * Catches all types of errors: JS errors, promise rejections, native errors
 */

import { Platform } from 'react-native';

class ErrorHandler {
    constructor() {
        this.errorListeners = [];
        this.isInitialized = false;
    }

    /**
     * Initialize global error handlers
     * Call this ONCE in your App.js/App.tsx
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('ErrorHandler already initialized');
            return;
        }

        console.log('🛡️ Initializing Global Error Handler...');

        // 1. Catch all JavaScript errors
        if (ErrorUtils) {
            const originalHandler = ErrorUtils.getGlobalHandler();

            ErrorUtils.setGlobalHandler((error, isFatal) => {
                console.error('🔴 Global JS Error:', {
                    message: error.message,
                    stack: error.stack,
                    isFatal,
                });

                this.notifyListeners({
                    type: 'js_error',
                    error,
                    isFatal,
                    timestamp: new Date().toISOString(),
                });

                // Call original handler
                if (originalHandler) {
                    originalHandler(error, isFatal);
                }
            });
        }

        // 2. Catch unhandled promise rejections
        if (typeof global !== 'undefined') {
            const promiseRejectionHandler = (reason, promise) => {
                console.error('🔴 Unhandled Promise Rejection:', {
                    reason: reason?.message || reason,
                    stack: reason?.stack,
                });

                this.notifyListeners({
                    type: 'promise_rejection',
                    reason,
                    promise,
                    timestamp: new Date().toISOString(),
                });
            };

            // For React Native
            if (global.HermesInternal || global.__fbBatchedBridge) {
                global.addEventListener?.('unhandledrejection', (event) => {
                    promiseRejectionHandler(event.reason, event.promise);
                });
            }

            // For Node.js-like environments
            if (typeof process !== 'undefined' && process.on) {
                process.on('unhandledRejection', promiseRejectionHandler);
            }
        }

        // 3. Catch console errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            this.notifyListeners({
                type: 'console_error',
                args,
                timestamp: new Date().toISOString(),
            });
            originalConsoleError.apply(console, args);
        };

        this.isInitialized = true;
        console.log('✅ Global Error Handler initialized');
    }

    /**
     * Add error listener
     * @param {Function} listener - Callback function
     */
    addListener(listener) {
        this.errorListeners.push(listener);
        return () => {
            this.errorListeners = this.errorListeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners
     */
    notifyListeners(errorInfo) {
        this.errorListeners.forEach(listener => {
            try {
                listener(errorInfo);
            } catch (err) {
                console.error('Error in error listener:', err);
            }
        });
    }

    /**
     * Log error to external service (Sentry, Firebase, etc.)
     */
    logToService(errorInfo) {
        // TODO: Implement logging to Sentry, Firebase Crashlytics, etc.
        console.log('📊 Logging error to service:', errorInfo);
    }

    /**
     * Safe async wrapper - catches errors in async functions
     * @param {Function} asyncFn - Async function to wrap
     * @param {Object} options - Options
     */
    async safeAsync(asyncFn, options = {}) {
        const {
            onError = null,
            defaultValue = null,
            context = 'Unknown',
        } = options;

        try {
            return await asyncFn();
        } catch (error) {
            console.error(`🔴 Error in ${context}:`, error);

            this.notifyListeners({
                type: 'safe_async_error',
                context,
                error,
                timestamp: new Date().toISOString(),
            });

            if (onError) {
                onError(error);
            }

            return defaultValue;
        }
    }

    /**
     * Safe promise wrapper - ensures promise errors are caught
     * @param {Promise} promise - Promise to wrap
     * @param {Object} options - Options
     */
    async safePromise(promise, options = {}) {
        const {
            onError = null,
            defaultValue = null,
            context = 'Unknown',
        } = options;

        try {
            return await promise;
        } catch (error) {
            console.error(`🔴 Promise error in ${context}:`, error);

            this.notifyListeners({
                type: 'safe_promise_error',
                context,
                error,
                timestamp: new Date().toISOString(),
            });

            if (onError) {
                onError(error);
            }

            return defaultValue;
        }
    }

    /**
     * Wrap native module calls with error handling
     * @param {Function} nativeFn - Native function to call
     * @param {Object} options - Options
     */
    async safeNativeCall(nativeFn, options = {}) {
        const {
            onError = null,
            defaultValue = null,
            context = 'Native Call',
            timeout = 10000,
        } = options;

        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Native call timeout')), timeout);
            });

            const result = await Promise.race([
                nativeFn(),
                timeoutPromise,
            ]);

            return result;
        } catch (error) {
            console.error(`🔴 Native call error in ${context}:`, {
                message: error.message,
                code: error.code,
                nativeStackAndroid: error.nativeStackAndroid,
            });

            this.notifyListeners({
                type: 'native_error',
                context,
                error,
                platform: Platform.OS,
                timestamp: new Date().toISOString(),
            });

            if (onError) {
                onError(error);
            }

            return defaultValue;
        }
    }
}

// Export singleton instance
const errorHandler = new ErrorHandler();
export default errorHandler;

/**
 * Utility functions for common error handling patterns
 */

/**
 * Safe async function wrapper
 */
export const safeAsync = async (fn, context = 'Unknown') => {
    return errorHandler.safeAsync(fn, { context });
};

/**
 * Safe promise wrapper
 */
export const safePromise = async (promise, context = 'Unknown') => {
    return errorHandler.safePromise(promise, { context });
};

/**
 * Safe native call wrapper
 */
export const safeNativeCall = async (fn, context = 'Native Call') => {
    return errorHandler.safeNativeCall(fn, { context });
};

/**
 * Try-catch wrapper for synchronous code
 */
export const safeTry = (fn, onError = null, defaultValue = null) => {
    try {
        return fn();
    } catch (error) {
        console.error('🔴 Safe try error:', error);
        if (onError) {
            onError(error);
        }
        return defaultValue;
    }
};
