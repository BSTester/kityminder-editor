/**
 * @fileOverview
 *
 *  与后端交互的服务
 *
 * @author: zhangbobell
 * @email : zhangbobell@163.com
 *
 * @copyright: Baidu FEX, 2015
 */
angular.module('kityminderEditor')
    .service('server', ['config', '$http',  function(config, $http) {

        return {
            uploadImage: function(file) {
                var url = config.get('imageUpload');
                var headers = config.get('headers') || {};
                var fd = new FormData();
                fd.append('upload_file', file);
                headers['Content-Type'] = undefined;
                return $http.post(url, fd, {
                    transformRequest: angular.identity,
                    headers: headers
                });
            }
        }
    }]);