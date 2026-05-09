module.exports.AntiCrash = (client) => {
    process.on('unhandledRejection', (reason, p) => {
        client.logger.error('Unhandled Rejection/Catch');
        console.log(reason, p);
    });

    process.on('uncaughtException', (err, origin) => {
        client.logger.error('Uncaught Exception/Catch');
        console.log(err, origin);
    });

    process.on('uncaughtExceptionMonitor', (err, origin) => {
        client.logger.error('Uncaught Exception/Catch (Monitor)');
        console.log(err, origin);
    });
};
