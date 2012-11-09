/* Функция которая возвратит обьект CloudCommander
 * @CloudFunc - обьект содержащий общий функционал
 *  клиентский и серверный
 */

var Util, DOM, CloudCommander = (function(){
"use strict";

/* Клиентский обьект, содержащий функциональную часть*/
var CloudClient = {        
    /* Конструктор CloudClient, который выполняет
     * весь функционал по инициализации
     */
    init                    : null, /* start initialization             */
    
    KeyBinding              : null, /* обьект обработки нажатий клавишь */
    Config                  : null, /* function loads and shows config  */
    Editor                  : null, /* function loads and shows editor  */
    Storage                 : null, /* function loads storage           */
    Viewer                  : null, /* function loads and shows viewer  */
    Terminal                : null, /* function loads and shows terminal*/
    Menu                    : null, /* function loads and shows menu    */
    GoogleAnalytics         : null,
            
    _loadDir                : null, /* Функция привязываеться ко всем
                                     * ссылкам и
                                     * загружает содержимое каталогов */
    
    /* ОБЬЕКТЫ */
    /* Обьект для работы с кэшем */
    Cache                  : {},    
    
    /* ПРИВАТНЫЕ ФУНКЦИИ */
    /* функция загружает json-данные о файловой системе */
    _ajaxLoad              : null,
    
    /* Функция генерирует JSON из html-таблицы файлов */
    _getJSONfromFileTable  : null,
    
    /* функция меняет ссыки на ajax-овые */
    _changeLinks           : null,     
    
    /* КОНСТАНТЫ*/
    /* название css-класа текущего файла*/
    CURRENT_FILE           : 'current-file',
    LIBDIR                 : '/lib/',
    LIBDIRCLIENT           : '/lib/client/',
    /* height of Cloud Commander
    * seting up in init()
    */
    HEIGHT                 : 0,
    MIN_ONE_PANEL_WIDTH    : 1155,
    OLD_BROWSER            : false
};



var cloudcmd = CloudClient,

/* глобальные переменные */
CloudFunc, $, KeyBinding,

/* short names used all the time functions */
    getByClass, getById;


/**
 * function load modules
 * @pParams = {name, path, func, dobefore, arg}
 */
var loadModule                      = function(pParams){    
    if(!pParams) return;
    
    var lName       = pParams.name,
        lPath       = pParams.path,
        lFunc       = pParams.func,
        lDoBefore   = pParams.dobefore;
    
    if( Util.isString(pParams) )
        lPath = pParams;
    
    if(lPath && !lName){
        lName = lPath[0].toUpperCase() + lPath.substring(1);
        lName = lName.replace('.js', '');
        
        var lSlash = lName.indexOf('/');
        if(lSlash > 0){
            var lAfterSlash = lName.substr(lSlash);
            lName = lName.replace(lAfterSlash, '');
        }
    }
    
    if( !Util.isContainStr(lPath, '.js') )
        lPath += '.js';
    
    cloudcmd[lName] = function(pArg){
        Util.exec(lDoBefore);
        
        DOM.jsload(cloudcmd.LIBDIRCLIENT + lPath, lFunc ||
            function(){
                cloudcmd[lName].Keys(pArg);
            });
    };
};

/* 
 * Обьект для работы с кэшем
 * в него будут включены функции для
 * работы с LocalStorage, webdb,
 * indexed db etc.
 */
CloudClient.Cache                   = {
    _allowed     : true,     /* приватный переключатель возможности работы с кэшем */
    
    /* функция проверяет возможно ли работать с кэшем каким-либо образом */
    isAllowed   : function(){},
    
    /* Тип кэша, который доступен*/
    type        : {},
    
    /* Функция устанавливает кэш, если выбранный вид поддерживаеться браузером*/
    set         :function(){},
    
    /* Функция достаёт кэш, если выбранный вид поддерживаеться браузером*/
    get         : function(){},
    
    /* функция чистит весь кэш для всех каталогов*/
    clear       : function(){}
};


/** функция проверяет поддерживаеться ли localStorage */
CloudClient.Cache.isAllowed         = (function(){
    if(window.localStorage   && 
        localStorage.setItem &&
        localStorage.getItem){
        CloudClient.Cache._allowed=true;
    }else
        {
            CloudClient.Cache._allowed=false;
            /* загружаем PolyFill для localStorage,
             * если он не поддерживаеться браузером
             * https://gist.github.com/350433 
             */
            /*
            DOM.jsload('https://raw.github.com/gist/350433/c9d3834ace63e5f5d7c8e1f6e3e2874d477cb9c1/gistfile1.js',
                function(){CloudClient.Cache._allowed=true;
            });
            */
        }
});
 
 /** если доступен localStorage и
  * в нём есть нужная нам директория -
  * записываем данные в него
  */
CloudClient.Cache.set               = function(pName, pData){
    if(CloudClient.Cache._allowed && pName && pData){
        localStorage.setItem(pName,pData);
    }
};

/** Если доступен Cache принимаем из него данные*/
CloudClient.Cache.get               = function(pName){
    if(CloudClient.Cache._allowed  && pName){
        return localStorage.getItem(pName);
    }
    else return null;
};

/** Функция очищает кэш */
CloudClient.Cache.clear             = function(){
    if(CloudClient.Cache._allowed){
        localStorage.clear();
    }
};

CloudClient.GoogleAnalytics         = function(){
   /* google analytics */
   var lFunc = document.onmousemove;
   
   document.onmousemove = function(){
        setTimeout(function(){
            DOM.jsload('lib/client/google_analytics.js');
        },5000);
        
        Util.exec(lFunc);
        
        document.onmousemove = lFunc;
   };
};

/**
 * Функция привязываеться ко всем ссылкам и
 *  загружает содержимое каталогов
 */
CloudClient._loadDir                = function(pLink,pNeedRefresh){
    /* @pElem - элемент, 
     * для которого нужно
     * выполнить загрузку
     */
        return function(pEvent){
            var lRet = true;
            /* показываем гиф загрузки возле пути папки сверху*/
            /* ctrl+r нажата? */
                        
            DOM.Images.showLoad(pNeedRefresh ? {top:true} : null);
            
            var lPanel = DOM.getPanel(),
            /* получаем имя каталога в котором находимся*/ 
                lHref = DOM.getByClass('path', lPanel);
            
            lHref = lHref[0].textContent;
            
            lHref       = CloudFunc.removeLastSlash(lHref);
            var lSubstr = lHref.substr(lHref,lHref.lastIndexOf('/'));
            lHref       = lHref.replace(lSubstr+'/','');
                                     
            /* загружаем содержимое каталога */
            CloudClient._ajaxLoad(pLink, pNeedRefresh);
            
            /* получаем все элементы выделенной папки*/
            /* при этом, если мы нажали обновить
             * или <Ctrl>+R - ссылок мы ненайдём
             * и заходить не будем
             */
            var lA = DOM.getCurrentLink(this);
            
            /* если нажали на ссылку на верхний каталог*/
            if(lA && lA.textContent==='..' && lHref!=='/'){
            
            /* функция устанавливает курсор на каталог
             * с которого мы пришли, если мы поднялись
             * в верх по файловой структуре
             */
                CloudClient._currentToParent(lHref);
            }
            
            /* что бы не переходить по ссылкам
             * а грузить всё ajax'ом,
             * возвращаем false на событие
             * onclick
             */
             
             pEvent.returnValue = false;
             
            return lRet;
        };
    };


/**
 * Function edits file name
 *
 * @param pParent - parent element
 * @param pEvent
 */
CloudClient._editFileName           = function(pParent){
    var lA = DOM.getCurrentLink(pParent);
    
    if (lA && lA.textContent !== '..'){
            
            lA.contentEditable = true;
            KeyBinding.unSet();
            
            var lDocumentOnclick = document.onclick;
            
            /* setting event handler onclick
             * if user clicks somewhere keyBinded
             * backs
             */
            document.onclick = (function(){
                var lA = DOM.getCurrentLink(pParent);
                if (lA && lA.textContent !== '..')
                    lA.contentEditable = false;
                                
                KeyBinding.set();
                
                /* backs old document.onclick 
                 * and call it if it was
                 * setted up earlier
                 */
                document.onclick = lDocumentOnclick;
                
                Util.exec(lDocumentOnclick);
                
            });
    }
};

/* Функция устанавливает текущим файлом, тот
 * на который кликнули единожды
 */
CloudClient._setCurrent             = function(){
        /*
         * @pFromEnter - если мы сюда попали 
         * из события нажатия на энтер - 
         * вызоветься _loadDir
         */
        return function(pFromEnter){
            var lCurrentFile = DOM.getCurrentFile();
            if(lCurrentFile){                        
                if (DOM.isCurrentFile(this)  &&
                    !Util.isBoolean(pFromEnter)){
                    //var lParent = this;
                    
                    //setTimeout(function(){
                        /* waiting a few seconds
                         * and if classes still equal
                         * make file name editable
                         * in other case
                         * double click event happend
                         */
                    //    if(DOM.getCurrentFile() === lParent)
                     //       CloudClient._editFileName(lParent);
                     //   },1000);
                }
                else{                        
                    /* устанавливаем курсор на файл, на который нажали */
                    DOM.setCurrentFile(this);
                }
            }
             /* если мы попали сюда с энтера */
             if(pFromEnter===true){
                var lResult = Util.exec( Util.bind(this.ondblclick, this) );
                    /*  enter pressed on file */
                if(!lResult){
                    var lA = DOM.getCurrentLink(this);
                    Util.exec( Util.bind(lA.ondblclick, this) );
                }
             }/* если мы попали сюда от клика мышки */
             else
                pFromEnter.returnValue = false;
                                       
            /* что бы не переходить по ссылкам
             * а грузить всё ajax'ом,
             * возвращаем false на событие
             * onclick
             */
            return true;
        };
    };
    
/** функция устанавливает курсор на каталог
 * с которого мы пришли, если мы поднялись
 * в верх по файловой структуре
 * @param pDirName - имя каталога с которого мы пришли
 */
CloudClient._currentToParent        = function(pDirName){                                              
    /* опредиляем в какой мы панели:
    * правой или левой
    */
    var lPanel       = DOM.getPanel();

    /* убираем слэш с имени каталога*/
    pDirName = pDirName.replace('/','');
    
    var lRootDir = getById(pDirName + '(' + lPanel.id + ')');
    
    /* if found li element with ID directory name
     * set it to current file
     */
    if(lRootDir){
        DOM.setCurrentFile(lRootDir);
        DOM.scrollIntoViewIfNeeded(lRootDir, true);
    }
};

/** Конструктор CloudClient, который
 * выполняет весь функционал по
 * инициализации
 */
CloudClient.init                    = function(){
    getByClass  = DOM.getByClass;
    getById     = DOM.getById;
    
    
    //Util.socketLoad();
    
    if(!document.body.scrollIntoViewIfNeeded){
        this.OLD_BROWSER = true;
            DOM.jsload(CloudClient.LIBDIRCLIENT + 'ie.js',
                function(){
                    DOM.jqueryLoad( baseInit );
                });
    }
    else baseInit();
};

function initModules(){
    
    loadModule({
        /* привязываем клавиши к функциям */
        path  : 'keyBinding.js',
        func : function(){            
            KeyBinding  = cloudcmd.KeyBinding;
            KeyBinding.init();
        }
     });
        
    DOM.ajax({
        url:'/modules.json',
        success: function(pModules){
            if( Util.isArray(pModules) )
                for(var i = 0, n = pModules.length; i < n ; i++)
                    loadModule(pModules[i]);
        }
    });
}

function baseInit(){
    if(applicationCache){        
        var lFunc = applicationCache.onupdateready;
        
        applicationCache.onupdateready = function(){
            console.log('app cacheed');
            location.reload();
            
            Util.exec(lFunc);
        };
    }
    /* меняем title 
     * если js включен - имена папок отображать необязательно...
     * а может и обязательно при переходе, можно будет это сделать
     */
    var lTitle = DOM.getByTag('title');
    if(lTitle.length > 0)
        lTitle[0].textContent = 'Cloud Commander';
           
    /* загружаем общие функции для клиента и сервера                    */
    DOM.jsload(cloudcmd.LIBDIR + 'cloudfunc.js',function(){
        /* берём из обьекта window общий с сервером функционал          */
        CloudFunc = window.CloudFunc;
        
        /* меняем ссылки на ajax'овые                                   */
        cloudcmd._changeLinks(CloudFunc.LEFTPANEL);
        cloudcmd._changeLinks(CloudFunc.RIGHTPANEL);
                
        /* устанавливаем переменную доступности кэша                    */
        cloudcmd.Cache.isAllowed();    
        /* Устанавливаем кэш корневого каталога                         */ 
        if(!cloudcmd.Cache.get('/'))
            cloudcmd.Cache.set('/', cloudcmd._getJSONfromFileTable());
    });
              
    /* устанавливаем размер высоты таблицы файлов
     * исходя из размеров разрешения экрана
     */ 
                 
    /* выделяем строку с первым файлом                                  */
    var lFmHeader = getByClass('fm_header');
    if(lFmHeader && lFmHeader[0].nextSibling)
        DOM.setCurrentFile(lFmHeader[0].nextSibling);
    
    /* показываем элементы, которые будут работать только, если есть js */
    var lFM = getById('fm');
    if(lFM)
        lFM.className='localstorage';
        
    /* формируем и округляем высоту экрана
     * при разрешениии 1024x1280:
     * 658 -> 700
     */
    
    var lHeight = window.screen.height;
        lHeight = lHeight - (lHeight/3).toFixed();
        
    lHeight = (lHeight/100).toFixed()*100;
     
    cloudcmd.HEIGHT = lHeight;
     
    DOM.cssSet({id:'cloudcmd',
        inner:
            '.panel{'                           +
                'height:' + lHeight +'px;'      +
            '}'
    });
    
    initModules();
    cloudcmd.KeyBinding();
}

/* функция меняет ссыки на ajax-овые */
CloudClient._changeLinks            = function(pPanelID){
    /* назначаем кнопку очистить кэш и показываем её */
    var lClearcache = getById('clear-cache');
    if(lClearcache)
        lClearcache.onclick = CloudClient.Cache.clear;    
    
    /* меняем ссылки на ajax-запросы */
    var lPanel = getById(pPanelID),
        a = lPanel.getElementsByTagName('a'),
        
        /* номер ссылки иконки обновления страницы */
        lREFRESHICON = 0,
        
        /* путь в ссылке, который говорит
        * что js отключен
        */
        lNoJS_s = CloudFunc.NOJS,
        lFS_s   = CloudFunc.FS,
        
        /* right mouse click function varible */
        lOnContextMenu_f = function(pEvent){
            var lReturn_b = true;
            
            KeyBinding.unSet();
            
            /* getting html element
             * currentTarget - DOM event
             * target        - jquery event
             */
            var lTarget = pEvent.currentTarget || pEvent.target;
            DOM.setCurrentFile(lTarget);
            
            if(Util.isFunction(cloudcmd.Menu) ){
                cloudcmd.Menu({
                    x: pEvent.x,
                    y: pEvent.y
                });
                
                /* disabling browsers menu*/
                lReturn_b = false;
                DOM.Images.showLoad();
            }        
            
            return lReturn_b;
        },
        
    /* drag and drop function varible
     * download file from browser to descktop
     * in Chrome (HTML5)
     */
        lOnDragStart_f = function(pEvent){
            var lElement = pEvent.target,
                lLink = lElement.href,
                lName = lElement.textContent,        
                /* if it's directory - adding json extension */
                lType = lElement.parentElement.nextSibling;
            
            if(lType && lType.textContent === '<dir>'){
                lLink = lLink.replace(lNoJS_s,'');
                lName += '.json';
            }
            
            pEvent.dataTransfer.setData("DownloadURL",
                'application/octet-stream'  + ':' +
                lName                       + ':' + 
                lLink);
        },
        
        lSetCurrentFile_f = function(pEvent){
            var pElement = pEvent.target,
                lTag = pElement.tagName;
            
            if(lTag !== 'LI')
                do{            
                    pElement = pElement.parentElement;
                    lTag = pElement.tagName;
                }while(lTag !== 'LI');
            
            DOM.setCurrentFile(pElement);
        };
            
    var lLocation = document.location,
        lUrl = lLocation.protocol + '//' + lLocation.host;
    
    for(var i = 0, n = a.length; i < n ; i++)
    {        
        /* убираем адрес хоста*/
        var link = a[i].href.replace(lUrl,'');
        
        /* убираем значения, которые говорят,   *
         * об отсутствии js                     */     
        if(link.indexOf(lNoJS_s) === lFS_s.length){
            link = link.replace(lNoJS_s,'');
        }
        /* ставим загрузку гифа на клик*/
        if(i === lREFRESHICON){
            a[i].onclick = CloudClient._loadDir(link,true);
            
            a[i].parentElement.onclick = a[i].onclick;
        }
            
        /* устанавливаем обработчики на строку на одинарное и   *
         * двойное нажатие на левую кнопку мышки                */
        else{
            var lLi;
            
            try{
                lLi = a[i].parentElement.parentElement;
            }catch(error){console.log(error);}
            
            /* if we in path changing onclick events */
            if (lLi.className === 'path') {
                a[i].onclick  = CloudClient._loadDir(link);
            }
            else {
                lLi.onclick   = CloudClient._setCurrent();
                
                lLi.onmousedown = lSetCurrentFile_f;
                
                a[i].ondragstart = lOnDragStart_f;
                
                /* if right button clicked menu will
                 * loads and shows
                 */
                lLi.oncontextmenu = lOnContextMenu_f;
                
                /* если ссылка на папку, а не файл */
                if(a[i].target !== '_blank'){
                    lLi.ondblclick  = CloudClient._loadDir(link);
                    
                    if(lLi.addEventListener)
                        lLi.addEventListener('touchend',
                            CloudClient._loadDir(link),
                            false);                                        
                }
                
                lLi.id = (a[i].title ? a[i].title : a[i].textContent) +
                    '(' + pPanelID + ')';
            }
        }        
    }
};

/**
 * Функция загружает json-данные о Файловой Системе
 * через ajax-запрос.
 * @param path - каталог для чтения
 * @param pNeedRefresh - необходимость обновить данные о каталоге
 */
CloudClient._ajaxLoad               = function(path, pNeedRefresh){                                   
        /* Отображаем красивые пути */
        /* added supporting of russian  language */
        var lPath = decodeURI(path),
            lFS_s = CloudFunc.FS;
        
        if(lPath.indexOf(lFS_s) === 0){
            lPath = lPath.replace(lFS_s,'');
            
            if(lPath === '') lPath = '/';
        }
        console.log ('reading dir: "' + lPath + '";');
        
         /* если доступен localStorage и
          * в нём есть нужная нам директория -
          * читаем данные с него и
          * выходим
          * если стоит поле обязательной перезагрузки - 
          * перезагружаемся
          */
         
         /* опредиляем в какой мы панели:
          * правой или левой
          */
        var lPanel = DOM.getPanel().id;
         
        if(pNeedRefresh === undefined && lPanel){
            var lJSON = CloudClient.Cache.get(lPath);
            if (lJSON !== null){
                
                /* переводим из текста в JSON */
                if(window && !window.JSON){
                    try{
                        lJSON = eval('('+lJSON+')');
                    }catch(err){
                        console.log(err);
                    }
                }else lJSON = JSON.parse(lJSON);
                
                CloudClient._createFileTable(lPanel, lJSON);
                CloudClient._changeLinks(lPanel);
                
                return;
            }
        }
        
        /* ######################## */
        try{
            DOM.ajax({
                url: path,
                error: DOM.Images.showError,
                
                success:function(data, textStatus, jqXHR){                                            
                    /* если такой папки (или файла) нет
                     * прячем загрузку и показываем ошибку
                     */                 
                    if(!jqXHR.responseText.indexOf('Error:'))
                        return DOM.showError(jqXHR);

                    CloudClient._createFileTable(lPanel, data);
                    CloudClient._changeLinks(lPanel);
                                                                
                    /* Сохраняем структуру каталогов в localStorage,
                     * если он поддерживаеться браузером
                     */
                    /* переводим таблицу файлов в строку, для
                    * сохранения в localStorage
                    */
                    var lJSON_s = JSON.stringify(data);
                    console.log(lJSON_s.length);
                    
                    /* если размер данных не очень бошьой
                    * сохраняем их в кэше
                    */
                    if(lJSON_s.length<50000)
                        CloudClient.Cache.set(lPath,lJSON_s);                        
                }
            });
        }catch(err){console.log(err);}
};

/**
 * Функция строит файловую таблицу
 * @param pEleme - родительский элемент
 * @param pJSON  - данные о файлах
 */
CloudClient._createFileTable        = function(pElem, pJSON){    
    var lElem = getById(pElem);
    
    /* getting current element if was refresh */
    var lPath = getByClass('path', lElem);
    var lWasRefresh_b = lPath[0].textContent === pJSON[0].path;
    var lCurrent;    
    if(lWasRefresh_b)
        lCurrent = DOM.getCurrentFile();
            
    /* говорим построителю,
     * что бы он в нужный момент
     * выделил строку с первым файлом
     */
    
    /* очищаем панель */
    var i = lElem.childNodes.length;
    while(i--)
        lElem.removeChild(lElem.lastChild);
    
    /* заполняем панель новыми элементами */    
    lElem.innerHTML = CloudFunc.buildFromJSON(pJSON,true);
    
    /* searching current file */
    if(lWasRefresh_b && lCurrent){
        for(i = 0; i < lElem.childNodes.length; i++)
            if(lElem.childNodes[i].textContent === lCurrent.textContent){
                lCurrent = lElem.childNodes[i];
                break;
            }
        DOM.setCurrentFile(lCurrent);
        //lCurrent.parentElement.focus();
    }
};

/**
 * Функция генерирует JSON из html-таблицы файлов и
 * используеться при первом заходе в корень
 */
CloudClient._getJSONfromFileTable   = function(){
    var lLeft       = getById('left');    
    var lPath       = getByClass('path')[0].textContent;
    var lFileTable  = [{path:lPath,size:'dir'}];
    var lLI         = lLeft.getElementsByTagName('li');
    
    var j=1;/* счётчик реальных файлов */
    var i=1;/* счётчик элементов файлов в DOM */
    /* Если путь отличный от корневного
     * второй элемент li - это ссылка на верхний
     * каталог '..'
     */
    i=2; /* пропускам Path и Header*/
    
    for(; i <lLI.length;i++)
    {
        var lChildren = lLI[i].children;
        
        /* file attributes */
        var lAttr = {};
        /* getting all elements to lAttr object */ 
        for(var l = 0; l < lChildren.length; l++)
            lAttr[lChildren[l].className] = lChildren[l];
        
        /* mini-icon */
        var lIsDir = lAttr['mini-icon directory'] ? true : false;
        
        var lName = lAttr.name;
        lName &&
            (lName = lName.getElementsByTagName('a'));
        
        /* if found link to folder 
         * cheking is it a full name
         * or short
         */
         /* if short we got title 
         * if full - getting textConent
         */
        lName.length &&
            (lName = lName[0]);
            
        lName.title &&
            (lName = lName.title) ||
            (lName = lName.textContent);        
            
        /* если это папка - выводим слово dir вместо размера*/        
        var lSize = lIsDir ? 'dir' : lAttr.size.textContent;
        
        var lMode = lAttr.mode.textContent;
        
        /* переводим права доступа в цыфровой вид
         * для хранения в localStorage
         */
        lMode = CloudFunc.convertPermissionsToNumberic(lMode);
        
        lFileTable[j++]={
            name: lName,
            size: lSize,
            mode: lMode
        };
    }
    return JSON.stringify(lFileTable);
};

return CloudClient;
})();

try{
    window.onload = function(){
        'use strict';
        
        /* базовая инициализация*/
        CloudCommander.init();
        
        /* загружаем Google Analytics */
        CloudCommander.GoogleAnalytics();
    };
}
catch(err){}