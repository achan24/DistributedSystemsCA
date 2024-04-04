const grpc = require('@grpc/grpc-js');
const path = require('path');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = path.join(__dirname, 'thermostat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);

const thermostatProto = grpc.loadPackageDefinition(packageDefinition);