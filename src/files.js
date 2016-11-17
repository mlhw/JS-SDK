import Backendless from './backendless'
import utils from './utils'

function sendEncoded(e) {
    var xhr         = new XMLHttpRequest(),
        boundary    = '-backendless-multipart-form-boundary-' + getNow(),
        badResponse = function(xhr) {
            var result = {};
            try {
                result = JSON.parse(xhr.responseText);
            } catch (e) {
                result.message = xhr.responseText;
            }
            result.statusCode = xhr.status;
            return result;
        };

    xhr.open("PUT", this.uploadPath, true);
    xhr.setRequestHeader('Content-Type', 'text/plain');

    if (UIState !== null) {
        xhr.setRequestHeader("uiState", UIState);
    }

    var asyncHandler = this.asyncHandler;

    if (asyncHandler) {
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    asyncHandler.success(JSON.parse(xhr.responseText));
                } else {
                    asyncHandler.fault(JSON.parse(xhr.responseText));
                }
            }
        };
    }

    xhr.send(e.target.result.split(',')[1]);

    if (asyncHandler) {
        return xhr;
    }

    if (xhr.status >= 200 && xhr.status < 300) {
        return xhr.responseText ? JSON.parse(xhr.responseText) : true;
    } else {
        throw badResponse(xhr);
    }
}

function Files() {
    this.restUrl = Backendless.appPath + '/files';
}

Files.prototype = {

    saveFile: utils.promisified('_saveFile'),

    saveFileSync: utils.synchronized('_saveFile'),

    _saveFile  : function(path, fileName, fileContent, overwrite, async) {
        if (!path || !utils.isString(path)) {
            throw new Error('Missing value for the "path" argument. The argument must contain a string value');
        }

        if (!fileName || !utils.isString(path)) {
            throw new Error('Missing value for the "fileName" argument. The argument must contain a string value');
        }

        if (overwrite instanceof Backendless.Async) {
            async = overwrite;
            overwrite = null;
        }

        if (!(fileContent instanceof File)) {
            fileContent = new Blob([fileContent]);
        }

        if (fileContent.size > 2800000) {
            throw new Error('File Content size must be less than 2,800,000 bytes');
        }

        var baseUrl = this.restUrl + '/binary/' + path + ((utils.isString(fileName)) ? '/' + fileName : '') + ((overwrite) ? '?overwrite=true' : '');

        try {
            var reader = new FileReader();
            reader.fileName = encodeURIComponent(fileName).replace(/'/g, "%27").replace(/"/g, "%22");
            reader.uploadPath = baseUrl;
            reader.onloadend = sendEncoded;

            if (async) {
                reader.asyncHandler = async;
            }

            reader.onerror = function(evn) {
                async.fault(evn);
            };

            reader.readAsDataURL(fileContent);

            if (!async) {
                return true;
            }
        } catch (err) {
            console.log(err);
        }
    },

    upload: utils.promisified('_upload'),

    uploadSync: utils.synchronized('_upload'),

    _upload    : function(files, path, overwrite, async) {
        files = files.files || files;
        var baseUrl = this.restUrl + '/' + path + '/';
        var overwriting = '';

        if (utils.isBoolean(overwrite)) {
            overwriting = "?overwrite=" + overwrite;
        }

        if (isBrowser) {
            if (window.File && window.FileList) {
                if (files instanceof File) {
                    files = [files];
                }

                var filesError = 0;

                for (var i = 0, len = files.length; i < len; i++) {
                    try {
                        var reader = new FileReader();
                        reader.fileName = encodeURIComponent(files[i].name).replace(/'/g, "%27").replace(/"/g, "%22");
                        reader.uploadPath = baseUrl + reader.fileName + overwriting;
                        reader.onloadend = send;
                        reader.asyncHandler = async;
                        reader.onerror = function(evn) {
                            async.fault(evn);
                        };
                        reader.readAsBinaryString(files[i]);

                    } catch (err) {
                        filesError++;
                    }
                }
            }
            else {
                //IE iframe hack
                var ifrm = document.createElement('iframe');
                ifrm.id = ifrm.name = 'ifr' + utils.getNow();
                ifrm.width = ifrm.height = '0';

                document.body.appendChild(ifrm);
                var form = document.createElement('form');
                form.target = ifrm.name;
                form.enctype = 'multipart/form-data';
                form.method = 'POST';
                document.body.appendChild(form);
                form.appendChild(files);
                var fileName      = encodeURIComponent(files.value).replace(/'/g, "%27").replace(/"/g, "%22"),
                    index         = fileName.lastIndexOf('\\');

                if (index) {
                    fileName = fileName.substring(index + 1);
                }
                form.action = baseUrl + fileName + overwriting;
                form.submit();
            }
        } else {
            throw "Upload File not supported with NodeJS";
        }
    },

    listing: utils.promisified('_listing'),

    listingSync: utils.synchronized('_listing'),

    _listing   : function(path, pattern, recursively, pagesize, offset, async) {
        var responder = utils.extractResponder(arguments),
            isAsync   = responder != null,
            url       = this.restUrl + '/' + path;

        if ((arguments.length > 1) && !(arguments[1] instanceof Backendless.Async)) {
            url += "?";
        }

        if (utils.isString(pattern)) {
            url += ("pattern=" + pattern);
        }

        if (utils.isBoolean(recursively)) {
            url += ("&sub=" + recursively);
        }

        if (utils.isNumber(pagesize)) {
            url += "&pagesize=" + pagesize;
        }

        if (utils.isNumber(offset)) {
            url += "&offset=" + offset;
        }

        return Backendless._ajax({
            method      : 'GET',
            url         : url,
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    renameFile: utils.promisified('_renameFile'),

    renameFileSync: utils.synchronized('_renameFile'),

    _renameFile: function(oldPathName, newName, async) {
        this._checkPath(oldPathName);

        var parameters = {
            oldPathName: oldPathName,
            newName    : newName
        };

        return this._doAction("rename", parameters, async);
    },

    moveFile: utils.promisified('_moveFile'),

    moveFileSync: utils.synchronized('_moveFile'),

    _moveFile  : function(sourcePath, targetPath, async) {
        this._checkPath(sourcePath);
        this._checkPath(targetPath);

        var parameters = {
            sourcePath: sourcePath,
            targetPath: targetPath
        };

        return this._doAction("move", parameters, async);
    },

    copyFile: utils.promisified('_copyFile'),

    copyFileSync: utils.synchronized('_copyFile'),

    _copyFile  : function(sourcePath, targetPath, async) {
        this._checkPath(sourcePath);
        this._checkPath(targetPath);

        var parameters = {
            sourcePath: sourcePath,
            targetPath: targetPath
        };

        return this._doAction("copy", parameters, async);
    },

    _checkPath: function(path) {
        if (!(/^\//).test(path)) {
            path = "/" + path;
        }

        return path;
    },

    _doAction : function(actionType, parameters, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = !!responder;

        return Backendless._ajax({
            method      : 'PUT',
            url         : this.restUrl + '/' + actionType,
            data        : JSON.stringify(parameters),
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    remove: utils.promisified('_remove'),

    removeSync: utils.synchronized('_remove'),

    _remove    : function(fileURL, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;
        var url = fileURL.indexOf("http://") === 0 || fileURL.indexOf("https://") === 0 ? fileURL : this.restUrl + '/' + fileURL;

        Backendless._ajax({
            method      : 'DELETE',
            url         : url,
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    exists: utils.promisified('_exists'),

    existsSync: utils.synchronized('_exists'),

    _exists    : function(path, async) {
        if (!path || !utils.isString(path)) {
            throw new Error('Missing value for the "path" argument. The argument must contain a string value');
        }

        var responder = utils.extractResponder(arguments),
            isAsync   = responder != null,
            url       = this.restUrl + '/' + path + '?action=exists';

        return Backendless._ajax({
            method      : 'GET',
            url         : url,
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    removeDirectory: utils.promisified('_removeDirectory'),

    removeDirectorySync: utils.synchronized('_removeDirectory'),

    _removeDirectory: function(path, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        return Backendless._ajax({
            method      : 'DELETE',
            url         : this.restUrl + '/' + path,
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    /**
     * Count of files
     *
     * @param {string} path
     * @param {string} [pattern]
     * @param {boolean} [recursive]
     * @param {boolean} [countDirectories]
     *
     * @return {Promise}
     */
    getFileCount: utils.promisified('_getFileCount'),

    /**
     * Count of files (sync)
     *
     * @param {string} path
     * @param {string} [pattern]
     * @param {boolean} [recursive]
     * @param {boolean} [countDirectories]
     *
     * @return {number}
     */
    getFileCountSync: utils.synchronized('_getFileCount'),

    _getFileCount: function(path, pattern, recursive, countDirectories, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = !!responder;
        var query = this._buildCountQueryObject(arguments, isAsync);
        var queryString = this._getQueryParamsString(query);

        return Backendless._ajax({
            method      : 'GET',
            url         : this.restUrl + queryString,
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    _getQueryParamsString: function(query) {
        var params = '/' + query.path + '?action=count';

        delete query.path;

        for (var prop in query) {
            if (query.hasOwnProperty(prop) && query[prop] != null) {
                params += '&' + prop + '=' + encodeURIComponent(query[prop]);
            }
        }

        return params;
    },

    _buildCountQueryObject: function (args, isAsync) {
        args = isAsync ? Array.prototype.slice.call(args, 0, -1) : args;

        var query = {
            path: args[0],
            pattern: args[1] !== undefined ? args[1] : '*',
            recursive: args[2] !== undefined ? args[2] : false,
            countDirectories: args[3] !== undefined ? args[3] : false
        };

        this._validatePath(query.path);
        this._validatePattern(query.pattern);
        this._validateRecursive(query.recursive);
        this._validateCountDirectories(query.countDirectories);

        return query;
    },

    _validatePath: function(path) {
        var MSG_ERROR = 'Missing value for the "path" argument. The argument must contain a string value';

        if (!path || !utils.isString(path)) {
            throw new Error(MSG_ERROR);
        }
    },

    _validatePattern: function(pattern) {
        var MSG_ERROR = 'Missing value for the "pattern" argument. The argument must contain a string value';

        if (!pattern || !utils.isString(pattern)) {
            throw new Error(MSG_ERROR);
        }
    },

    _validateRecursive: function(recursive) {
        var MSG_ERROR = 'Missing value for the "recursive" argument. The argument must contain a boolean value';

        if (!utils.isBoolean(recursive)) {
            throw new Error(MSG_ERROR);
        }
    },

    _validateCountDirectories: function(countDirectories) {
        var MSG_ERROR = 'Missing value for the "countDirectories" argument. The argument must contain a boolean value';

        if (!utils.isBoolean(countDirectories)) {
            throw new Error(MSG_ERROR);
        }
    }
};

export default Files