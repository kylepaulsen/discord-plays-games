function FakeContext(width, height) {
    this.imageData = this.createImageData(width, height);
}

FakeContext.prototype.createImageData = function(width, height) {
    const imageData = new Uint8ClampedArray(width * height * 4);
    return {
        width,
        height,
        data: imageData
    };
};

FakeContext.prototype.putImageData = function(imageData) {
    this.imageData = imageData;
};

function FakeCanvas() {
    this.width = 0;
    this.height = 0;
    this.context = new FakeContext(0, 0);
}

FakeCanvas.prototype.getContext = function() {
    return this.context;
};

const AudioContext = function() {
    return {
        createJavaScriptNode: function() {
            return {
                connect: function() {}
            };
        }
    };
};

const addEventListener = function() {};

const document = {
    createElement: function(type) {
        if (type === 'canvas') {
            return new FakeCanvas();
        }
    }
};

const window = {
    AudioContext,
    addEventListener,
    document,
    setTimeout
};

const navigator = {};

module.exports = window;
