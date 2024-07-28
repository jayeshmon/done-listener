import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    mobile: { type: String, required: true },
    companyName: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

export { User };