const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    twentyFourSeven: { type: Boolean, default: false },
    textChannel: { type: String, default: null },
    voiceChannel: { type: String, default: null }
});

module.exports = mongoose.model('Guild', guildSchema);
