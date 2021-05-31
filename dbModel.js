import mongoose from 'mongoose';

const postSchema = mongoose.Schema({
  username: String,
  profileScr: String,
  text: String,
  timestamp: String,
  imageName: String,
});

export default mongoose.model('posts', postSchema);
