import { expect } from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../server.mjs'; // Assuming your server is exporting app

chai.use(chaiHttp);

describe('User API', () => {
    it('should register a user', async () => {
        const res = await chai.request(app)
            .post('/register')
            .send({ username: 'testuser', password: 'password123', role: 'user' });
        expect(res).to.have.status(201);
        expect(res.text).to.equal('User registered');
    });

    it('should login a user', async () => {
        const res = await chai.request(app)
            .post('/login')
            .send({ username: 'testuser', password: 'password123' });
        expect(res).to.have.status(200);
        expect(res.body.authenticated).to.be.true;
        expect(res.body.role).to.equal('user');
        expect(res.body.token).to.be.a('string');
    });
});

describe('Drone API', () => {
    it('should add a drone', async () => {
        const res = await chai.request(app)
            .post('/drones')
            .send({ imei: '1234567890', drone_name: 'Drone1', model: 'X100', status: 'Active', range: 500 });
        expect(res).to.have.status(201);
        expect(res.body).to.include({ imei: '1234567890', drone_name: 'Drone1', model: 'X100', status: 'Active', range: 500 });
    });

    it('should get a drone', async () => {
        const res = await chai.request(app)
            .get('/drones/1234567890');
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('drone_name', 'Drone1');
    });

    it('should update a drone', async () => {
        const res = await chai.request(app)
            .put('/drones/1234567890')
            .send({ drone_name: 'UpdatedDrone' });
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('drone_name', 'UpdatedDrone');
    });

    it('should delete a drone', async () => {
        const res = await chai.request(app)
            .delete('/drones/1234567890');
        expect(res).to.have.status(200);
        expect(res.text).to.equal('Drone deleted');
    });
});
