define(function(require, exports, module) {

    function xmindToJson(xmind) {
        // 标签 map
        var markerMap = {
            'priority-1': ['priority', 1],
            'priority-2': ['priority', 2],
            'priority-3': ['priority', 3],
            'priority-4': ['priority', 4],
            'priority-5': ['priority', 5],
            'priority-6': ['priority', 6],
            'priority-7': ['priority', 7],
            'priority-8': ['priority', 8],

            'task-start': ['progress', 1],
            'task-oct': ['progress', 2],
            'task-quarter': ['progress', 3],
            'task-3oct': ['progress', 4],
            'task-half': ['progress', 5],
            'task-5oct': ['progress', 6],
            'task-3quar': ['progress', 7],
            'task-7oct': ['progress', 8],
            'task-done': ['progress', 9]
        };

        function processTopic(topic, obj) {

            //处理文本
            obj.data = {
                text: topic.title,
                id: (+new Date() * 1e6 + Math.floor(Math.random() * 1e6)).toString(36),
                created: +new Date(),
                updated: +new Date()
            };

            // 处理标签
            if (topic.markers) {
                var markers = topic.markers;
                var type;
                if (markers.length && markers.length > 0) {
                    for (var i in markers) {
                        type = markerMap[markers[i].markerId];
                        if (type) obj.data[type[0]] = type[1];
                    }
                } else {
                    type = markerMap[markers.markerId];
                    if (type) obj.data[type[0]] = type[1];
                }
            }

            // 处理超链接
            if (topic.href) {
                obj.data.hyperlink = topic.href;
            }
            // 处理标签
            if (topic.labels) {
                obj.data.resource = topic.labels;
            }
            // 处理备注
            if (topic.notes) {
                obj.data.note = topic.notes.plain.content;
            }
            // 处理图片
            if (topic.image) {
                obj.data.image = topic.image.src;
            }
            //处理子节点
            var subTopics = topic.children && topic.children.attached;
            if (subTopics) {
                var tmp = subTopics;
                if (tmp.length && tmp.length > 0) { //多个子节点
                    obj.children = [];

                    for (var i in tmp) {
                        obj.children.push({});
                        processTopic(tmp[i], obj.children[i]);
                    }

                } else { //一个子节点
                    obj.children = [{}];
                    processTopic(tmp, obj.children[0]);
                }
            }
        }

        function xml2km(xml) {
            var result = {};
            var sheet = JSON.parse(xml);
            var topic = Array.isArray(sheet) ? sheet[0].rootTopic : sheet.rootTopic;
            processTopic(topic, result);
            return result;
        }

        function getEntries(file) {
            var zipReader = new zip.ZipReader(new zip.BlobReader(file));
            return zipReader.getEntries();
        }

        function readDocument(entries) {
            return new Promise(function(resolve, reject) {
                var entry, json;

                // 查找文档入口
                while ((entry = entries.pop())) {

                    if (entry.filename.split('/').pop() == 'content.json') break;

                    entry = null;

                }

                // 找到了读取数据
                if (entry) {

                    entry.getData(new zip.TextWriter()).then(function(text) {
                        try {
                            json = xml2km(text);
                            resolve(json);
                        } catch (e) {
                            reject(e);
                        }
                    });

                } 

                // 找不到返回失败
                else {
                    reject(new Error('Content document missing'));
                }
            });
        }
        return getEntries(xmind).then(readDocument);
    }

    function NodeRuntime() {
        var runtime = this;
        var minder = this.minder;
        var hotbox = this.hotbox;
        var fsm = this.fsm;

        var main = hotbox.state('main');

        var buttons = [
            '前移:Alt+Up:ArrangeUp',
            '下级:Tab|Insert:AppendChildNode',
            '同级:Enter:AppendSiblingNode',
            '后移:Alt+Down:ArrangeDown',
            '删除:Delete|Backspace:RemoveNode',
            '上级:Shift+Tab|Shift+Insert:AppendParentNode'
            //'全选:Ctrl+A:SelectAll'
        ];

        var AppendLock = 0;

        buttons.forEach(function(button) {
            var parts = button.split(':');
            var label = parts.shift();
            var key = parts.shift();
            var command = parts.shift();
            main.button({
                position: 'ring',
                label: label,
                key: key,
                action: function() {
                    if (command.indexOf('Append') === 0) {
                        AppendLock++;
                        minder.execCommand(command, '分支主题');

                        // provide in input runtime
                        function afterAppend () {
                            if (!--AppendLock) {
                                runtime.editText();
                            }
                            minder.off('layoutallfinish', afterAppend);
                        }
                        minder.on('layoutallfinish', afterAppend);
                    } else {
                        minder.execCommand(command);
                        fsm.jump('normal', 'command-executed');
                    }
                },
                enable: function() {
                    return minder.queryCommandState(command) != -1;
                }
            });
        });

        main.button({
            position: 'bottom',
            label: '导入',
            key: 'Alt + V',
            enable: function() {
                return minder.queryCommandState('importData') != -1;
            },
            next: 'importData'
        });

        main.button({
            position: 'bottom',
            label: '导出',
            key: 'Alt + C',
            enable: function() {
                return minder.queryCommandState('exportData') != -1;
            },
            next: 'exportData'
        });
       
        var exportData = hotbox.state('exportData');
        ['json', 'text', 'markdown', 'svg', 'png'].forEach(function(t, i) {
            exportData.button({
                position: 'ring',
                label: t,
                key: (i+1).toString(),
                action: function() {
                    minder.exportData(t).then(function(data) {
                        var filename = minder._root.data.text || '下载';
                        var ext = t;
                        if (t === 'markdown') {
                            ext = 'md';
                        }else if (t === 'text') {
                            ext = 'txt';
                        }
                        var urlObject = window.URL || window.webkitURL || window;
                        var export_blob = new Blob([data]);
                        if(t==='png'){
                            var format = "image/png";
                            var code = window.atob(data.split(",")[1]);
                            var aBuffer = new window.ArrayBuffer(code.length);
                            var uBuffer = new window.Uint8Array(aBuffer);
                            for(var i = 0; i < code.length; i++){
                                uBuffer[i] = code.charCodeAt(i) & 0xff ;
                            }
                            export_blob = new Blob([uBuffer], {type: format});
                        }
                        var save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
                        save_link.href = urlObject.createObjectURL(export_blob);
                        save_link.download = filename +'.'+ ext;
                        save_link.click();
                    });
                }
            });
        });
        exportData.button({
            position: 'top',
            label: '返回',
            key: 'esc',
            next: 'back'
        });
        
        var importData = hotbox.state('importData');
        ['json', 'text', 'markdown', 'xmind'].forEach(function(t, i) {
            importData.button({
                position: 'ring',
                label: t,
                key: (i+1).toString(),
                action: function() {
                    var accept = t;
                    if (t === 'markdown') {
                        accept = 'text/markdown';
                    }else if (t === 'text') {
                        accept = 'text/plain';
                    }else if (t === 'json') {
                        accept = 'application/json';
                    }else if (t === 'xmind') {
                        accept = 'application/vnd.xmind.workbook';
                    }
                    var save_input = document.createElementNS("http://www.w3.org/1999/xhtml", "input")
                    save_input.type = "file";
                    save_input.accept = accept;
                    save_input.onchange = function(e) {
                        try {
                            var file = e.target.files[0];
                            var reader = new FileReader();
                            if(file.name.indexOf('.json')>0 || file.name.indexOf('.txt')>0 || file.name.indexOf('.md')>0){
                                reader.onload = function(evt) {
                                    minder.importData(t, evt.target.result);
                                };
                                reader.readAsText(file);
                            }else if (file.name.indexOf('.xmind')>0){
                                reader.onload = function(evt) {
                                    var arr = evt.target.result.split(',')
                                    var data = window.atob(arr[1])
                                    var mime = arr[0].match(/:(.*?);/)[1]
                                    var ia = new Uint8Array(data.length)
                                    for (var i = 0; i < data.length; i++) {
                                        ia[i] = data.charCodeAt(i)
                                    }
                                    xmindToJson(new Blob([ia], {type: mime})).then(function(data){
                                        minder.importJson(data);
                                    });
                                };
                                reader.readAsDataURL(file);
                            }else{
                                alert("Import file's type only support 'json', 'text', 'markdown' and 'xmind'.");
                            };
                        } catch (e) {
                            alert(e);
                        }
                    }
                    save_input.click();
                }
            });
        });
        importData.button({
            position: 'top',
            label: '返回',
            key: 'esc',
            next: 'back'
        });

        main.button({
           position: 'top',
           key: '/',
           action: function(){
               if (!minder.queryCommandState('expand')) {
                   minder.execCommand('expand');
               } else if (!minder.queryCommandState('collapse')) {
                   minder.execCommand('collapse');
               }
           },
           enable: function() {
               return minder.queryCommandState('expand') != -1 || minder.queryCommandState('collapse') != -1;
           },
           beforeShow: function() {
               if (!minder.queryCommandState('expand')) {
                   this.$button.children[0].innerHTML = '展开';
               } else {
                   this.$button.children[0].innerHTML = '收起';
               }
           }
        })
    }

    return module.exports = NodeRuntime;
});
