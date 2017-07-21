module.exports = {
    isUnixHiddenPath: function(file) {
        return (/(^\.)|(\/\.)/gm).test(file);
    }
};