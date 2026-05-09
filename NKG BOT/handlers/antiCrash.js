const logger = require('../utils/logger');

module.exports = (client) => {
    process.on('unhandledRejection', (reason, p) => {
        logger.error(`[ANTI-CRASH] Unhandled Rejection/Catch: ${reason}`);
        console.error(reason, p);
    });

    process.on('uncaughtException', (err, origin) => {
        logger.error(`[ANTI-CRASH] Uncaught Exception/Catch: ${err}`);
        console.error(err, origin);
    });

    process.on('uncaughtExceptionMonitor', (err, origin) => {
        logger.error(`[ANTI-CRASH] Uncaught Exception Monitor: ${err}`);
        console.error(err, origin);
    });
};
