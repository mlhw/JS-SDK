import DataQuery from './data-query'
import PagingQueryBuilder from './paging-query-builder'

var DataQueryBuilder = function() {
    this._query = new DataQuery();
    this._paging = new PagingQueryBuilder();
};

DataQueryBuilder.create = function() {
    return new DataQueryBuilder();
};

DataQueryBuilder.prototype = {
    setPageSize: function(pageSize){
        this._paging.setPageSize(pageSize);
        return this;
    },

    setOffset: function(offset){
        this._paging.setOffset(offset);
        return this;
    },

    prepareNextPage: function(){
        this._paging.prepareNextPage();

        return this;
    },

    preparePreviousPage: function(){
        this._paging.preparePreviousPage();

        return this;
    },

    getProperties: function(){
        return this._query.properties;
    },

    setProperties: function(properties){
        this._query.properties = Utils.castArray(properties);
        return this;
    },

    addProperty: function(property){
        this._query.addProperty(property);
        return this;
    },

    getWhereClause: function(){
        return this._query.condition;
    },

    setWhereClause: function(whereClause){
        this._query.condition = whereClause;
        return this;
    },

    getSortBy: function(){
        return this._query.getOption('sortBy');
    },

    setSortBy: function(sortBy){
        this._query.setOption('sortBy', Utils.castArray(sortBy));

        return this;
    },

    getRelated: function(){
        return this._query.getOption('relations');
    },

    setRelated: function(relations){
        this._query.setOption('relations', Utils.castArray(relations));

        return this;
    },

    getRelationsDepth: function(){
        return this._query.getOption('relationsDepth');
    },

    setRelationsDepth: function(relationsDepth){
        this._query.setOption('relationsDepth', relationsDepth);
        return this;
    },

    build: function(){
        this._query.setOptions(this._paging.build());

        return this._query.toJSON();
    }
};

export default DataQueryBuilder