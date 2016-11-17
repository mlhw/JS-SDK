import DataQuery from './data-query'
import PagingQueryBuilder from './paging-query-builder'

var LoadRelationsQueryBuilder = function(RelationModel) {
    this._query = new DataQuery();
    this._query.relationModel = RelationModel;
    this._paging = new PagingQueryBuilder();
};

LoadRelationsQueryBuilder.create = function() {
    return  new LoadRelationsQueryBuilder();
};

LoadRelationsQueryBuilder.of = function(RelationModel) {
    return  new LoadRelationsQueryBuilder(RelationModel);
};

LoadRelationsQueryBuilder.prototype = {
    setRelationName: function(relationName) {
        this._query.setOption('relationName', relationName);
        return this;
    },

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

    build: function(){
        this._query.setOptions(this._paging.build());

        return this._query.toJSON();
    }
};

export default LoadRelationsQueryBuilder