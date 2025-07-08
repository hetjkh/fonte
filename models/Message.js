const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  numbers: [{
    number: String,
    contents: [{
      text: String,
      mediaType: String,
      status: {
        type: String,
        enum: ['scheduled', 'processing', 'sent', 'failed'],
        default: 'processing'
      },
      scheduledTime: Date,
      processedTime: Date,
      error: String,
      jobKey: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }]
}, {
  timestamps: true
});

// Static method to find or create a message document for a user
messageSchema.statics.findOrCreateForUser = async function(userId) {
  let messageDoc = await this.findOne({ userId });
  if (!messageDoc) {
    messageDoc = new this({ userId, numbers: [] });
    await messageDoc.save();
  }
  return messageDoc;
};

// Method to add content to a number
messageSchema.methods.addContentToNumber = async function(number, content) {
  let numberEntry = this.numbers.find(n => n.number === number);
  if (!numberEntry) {
    numberEntry = { number, contents: [] };
    this.numbers.push(numberEntry);
  }
  numberEntry.contents.push(content);
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);