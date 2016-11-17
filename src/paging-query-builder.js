import Backendless from './backendless'
import utils from './utils'

var PagingQueryBuilder = function() {
    this.offset = Backendless.DEFAULTS.offset;
    this.pageSize = Backendless.DEFAULTS.pageSize;
};

PagingQueryBuilder.prototype = {
    setPageSize: function(pageSize){
        utils.throwError(this.validatePageSize(pageSize));
        this.pageSize = pageSize;

        return this;
    },

    setOffset: function(offset){
        utils.throwError(this.validateOffset(offset));
        this.offset = offset;

        return this;
    },

    prepareNextPage: function(){
        this.setOffset(this.offset + this.pageSize);

        return this;
    },

    preparePreviousPage: function(){
        var newOffset = this.offset > this.pageSize ? this.offset - this.pageSize : 0;

        this.setOffset(newOffset);

        return this;
    },

    validateOffset: function(offset) {
        if (offset < 0) {
            return 'Offset cannot have a negative value.';
        }
    },

    validatePageSize: function(pageSize) {
        if (pageSize <= 0) {
            return 'Page size must be a positive value.';
        }
    },

    build: function() {
        return {
            pageSize: this.pageSize,
            offset: this.offset
        }
    }
};

export default PagingQueryBuilder