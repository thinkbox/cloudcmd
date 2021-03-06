var CloudCmd, Util, DOM;

(function(CloudCmd, Util, DOM) {
    'use strict';
    
    CloudCmd.Config = ConfigProto;
        
    function ConfigProto() {
        var Loading     = true,
            Key         = CloudCmd.Key,
            Images      = DOM.Images,
            Events      = DOM.Events,
            showLoad    = Images.showLoad.bind(DOM, {
                top: true
            }),
            INPUT       = 'INPUT',
            CONFIG,
            TEMPLATE,
            Notify      = DOM.Notify,
            Config      = this;
            
        function init(pCallBack) {
            Loading     = true;
            
            showLoad();
            Util.loadOnLoad([
                CloudCmd.View,
                function(callback) {
                    Loading = false;
                    Util.exec(callback);
                },
                Config.show
            ]);
        }
        
        this.show               = function() {
            var funcs = [
                getTemplate,
                cssLoad
            ];
            
            if (!Loading) {
                showLoad();
                Util.asyncCall(funcs, fillTemplate);
            }
        };
        
        function cssLoad(callback) {
            DOM.cssLoad({
                src : '/css/config.css',
                func: Util.retExec(callback)
            });
        }
        
        
        function getTemplate(callback) {
            Util.ifExec(TEMPLATE, callback, function (execCall) {
                    DOM.ajax({
                    url     : '/html/config.html', 
                    success :  function(data) {
                        TEMPLATE = data;
                        execCall();
                    },
                    error   : Images.showError
                });
                
            });
        }
        
        function fillTemplate() {
            CloudCmd.getConfig(function(config) {
                var i, n, div, data, li, param, obj; 
                
                CONFIG  = config;
                obj     = Util.copyObj(CONFIG);
                changeConfig(obj);
                data    = Util.render(TEMPLATE, obj);
                div     = DOM.anyload({
                    name        : 'div',
                    className   : 'config',
                    inner       : data.toString()
                });
                
                li      = DOM.getByTag(INPUT, div);
                n       = li.length;
                
                for (i = 0; i < n; i++) {
                    param = li[i];
                    Events.add('change', change, param);
                    Events.addKey(key, param);
                }
                
                Images.hideLoad();
                CloudCmd.View.show(div, null, {
                    autoSize: true
                });
            });
        }
        
        this.hide               = function() {
            CloudCmd.View.hide();
        };
        
        
        function changeConfig(config) {
            var name;
            
            for (name in config)
                if (Util.isBoolean(config[name]))
                    config[name] = setState(config[name]);
        }
        
        function setState(state) {
            var ret = "";
            
            if (state)
                ret = " checked";
            
            return ret;
        }
        
        function change(event) {
            var data,
                obj     = {},
                el      = event.target,
                name    = el.id,
                type    = el.type;
            
            if (el.type === 'checkbox')
                data = el.checked;
            else
                data = el.value;
            
            obj[name] = data;
            
            if (name === 'notifications') {
                if (data && !Notify.check())
                    Notify.request();
            }
            
            CONFIG[name] = data;
            CloudCmd.setConfig(CONFIG);
            
            DOM.RESTful.config(obj);
        }
        
        function key(event) {
            var keyCode = event.keyCode,
                ESC     = Key.ESC;
            
            if (keyCode === ESC)
                Config.hide();
        }
        
        init();
    }
    
})(CloudCmd, Util, DOM);
