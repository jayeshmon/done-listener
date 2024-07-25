import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    drones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Drone' }] // Reference to Drone model
});

const User = mongoose.model('User', userSchema);
export { User};
