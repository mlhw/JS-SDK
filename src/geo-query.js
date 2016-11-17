var GeoQuery = function() {
    this.searchRectangle = undefined;
    this.categories = [];
    this.includeMetadata = true;
    this.metadata = undefined;
    this.condition = undefined;
    this.relativeFindMetadata = undefined;
    this.relativeFindPercentThreshold = undefined;
    this.pageSize = undefined;
    this.latitude = undefined;
    this.longitude = undefined;
    this.radius = undefined;
    this.units = undefined;
    this.degreePerPixel = undefined;
    this.clusterGridSize = undefined;
};

GeoQuery.prototype = {
    addCategory        : function() {
        this.categories = this.categories || [];
        this.categories.push();
    },

    setClusteringParams: function(westLongitude, eastLongitude, mapWidth, clusterGridSize) {
        clusterGridSize = clusterGridSize || 0;
        var parsedWestLongitude   = parseFloat(westLongitude),
            parsedEastLongitude   = parseFloat(eastLongitude),
            parsedMapWidth        = parseInt(mapWidth),
            parsedClusterGridSize = parseInt(clusterGridSize);

        if (!isFinite(parsedWestLongitude) || parsedWestLongitude < -180 || parsedWestLongitude > 180) {
            throw new Error("The westLongitude value must be a number in the range between -180 and 180");
        }

        if (!isFinite(parsedEastLongitude) || parsedEastLongitude < -180 || parsedEastLongitude > 180) {
            throw new Error("The eastLongitude value must be a number in the range between -180 and 180");
        }

        if (!isFinite(parsedMapWidth) || parsedMapWidth < 1) {
            throw new Error("The mapWidth value must be a number greater or equal to 1");
        }

        if (!isFinite(parsedClusterGridSize) || parsedClusterGridSize < 0) {
            throw new Error("The clusterGridSize value must be a number greater or equal to 0");
        }

        var longDiff = parsedEastLongitude - parsedWestLongitude;

        (longDiff < 0) && (longDiff += 360);

        this.degreePerPixel = longDiff / parsedMapWidth;
        this.clusterGridSize = parsedClusterGridSize || null;
    }
};

export default GeoQuery