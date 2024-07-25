import mongoose from 'mongoose';

const droneSchema = new mongoose.Schema({
    imei: { type: String, required: true },
    drone_name: { type: String, required: true },
    model: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], required: true },
    range: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Optional reference to User model
});

const Drone = mongoose.model('Drone', droneSchema);
export {Drone};
