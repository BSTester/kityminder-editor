define(function(require, exports, module) {

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
        ['json', 'text', 'markdown'].forEach(function(t, i) {
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
                    }
                    var save_input = document.createElementNS("http://www.w3.org/1999/xhtml", "input")
                    save_input.type = "file";
                    save_input.accept = accept;
                    save_input.onchange = function(e) {
                        var file = e.target.files[0];
                        var reader = new FileReader();
                        reader.onload = function(evt) {
                            try {
                                if(file.name.indexOf('.json')>0 || file.name.indexOf('.txt')>0 || file.name.indexOf('.md')>0){
                                    minder.importData(t, evt.target.result);
                                }else{
                                    alert("Import file's type only support 'json', 'text' and 'markdown'.");
                                };
                            } catch (e) {
                                alert(e);
                            }
                        };
                        reader.readAsText(file);
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
