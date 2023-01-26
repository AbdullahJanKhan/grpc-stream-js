const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
let health = require('grpc-js-health-check');

require('dotenv').config()

var mongoose = require('mongoose');
mongoose.set('strictQuery', true);
const connection = mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
connection.then((db) => {
  console.log("===Connected correctly to server===\n");
}, (err) => { console.log(err); });

var Schema = mongoose.Schema;
var Loaction = new Schema({
  driverId: {
    type: String,
  },
  longitude: {
    type: String
  },
  latitude: {
    type: String
  }
})

const locationsDB = mongoose.model('Loaction', Loaction);

function getServerCredentials() {
  const serverCert = fs.readFileSync("./certs/server-cert.pem");
  const serverKey = fs.readFileSync("./certs/server-key.pem");

  const serverCredentials = grpc.ServerCredentials.createSsl(
    null,
    [
      {
        cert_chain: serverCert,
        private_key: serverKey,
      },
    ],
    false
  );
  return serverCredentials;
}

function main() {
  const server = new grpc.Server();
  const packageDefinition = protoLoader.loadSync("./proto/locationStream.proto", {});
  const statusMap = {
    "locationTrackingApp.Location": health.servingStatus.SERVING,
    "": health.servingStatus.SERVING,
  };
  // Construct the service implementation
  let healthImpl = new health.Implementation(statusMap);

  const locationTrackingApp =
    grpc.loadPackageDefinition(packageDefinition).locationTrackingApp;
  // Add the service
  server.addService(locationTrackingApp.Location.service, {
    updateLocation: updateLocation,
    getLocations: getLocations,
  });
  server.addService(health.service, healthImpl);

  const credentials = getServerCredentials();

  server.bindAsync("0.0.0.0:50051", credentials, (err, port) => {
    if (err) {
      console.error(err)
      return
    }
    server.start();
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

// Uhm, this is going to mirror our database, but we can change it to use an actual database.
var driverLocations = {};

function updateLocation(call, callback) {

  call.on('data', (req) => {
    if (!driverLocations[req.driverId]) {
      driverLocations = {
        ...driverLocations,
        [req.driverId]: [{
          longitude: req.longitude,
          latitudes: req.latitudes
        }]
      }
    } else {
      driverLocations[req.driverId].push({
        longitude: req.longitude,
        latitudes: req.latitudes
      })
    }
    const loc = new locationsDB({
      driverId: req.driverId,
      latitude: req.latitudes,
      longitude: req.longitude
    })

    loc.save((err, data) => {
      if (err) {
        console.error(err)
      }
    })
  })


  call.on('end', () => {
    console.log("===Stream Completed===")
    callback(null, {});
  });
}

function getLocations(call) {

  const id = call.request.driverId
  locationsDB.find({
    'driverId': id
  }, (err, res) => {
    if (err)
      console.error(err)
    if (res.length > 0) {
      res.forEach((data) => {
        let res = {
          longitude: data.longitude,
          latitudes: data.latitude
        }
        call.write(res)
      })
    }
    call.end()
  })

}

main();
