const cluster = require ('cluster');
const numCPUs = require('os').cpus().length;

module.exports = {
    dasherize: function (val) {
        if (val) {
            var value = val.replace(/\s+/g, '-').toLowerCase();
            console.log(value);
            return value;
        } else {
            return '';
        }
    },

    launch: () => {
        console.log('Before the fork');

        if (cluster.isMaster) {
            console.log('I am the master, launching workers!');
        } else {
            console.log('I am a worker!');
        }
        console.log('After the fork.');
    }
};