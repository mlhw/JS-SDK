
var DataQuery = function() {
    this.properties = [];
    this.condition = null;
    this.options = null;
    this.url = null;
};

DataQuery.prototype = {
    addProperty: function(prop) {
        this.properties = this.properties || [];
        this.properties.push(prop);
    },

    setOption: function(name, value) {
        this.options = this.options || {};

        this.options[name] = value;
    },

    setOptions: function(options) {
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                this.setOption(key, options[key]);
            }
        }
    },

    getOption: function(name) {
        return this.options && this.options[name];
    },

    toJSON: function () {
        var result = {};

        for (var key in this) {
            if (this.hasOwnProperty(key)) {
                result[key] = this[key]
            }
        }

        return result;
    }
};

export default DataQuery