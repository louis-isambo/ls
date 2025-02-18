(function () {
    'use strict';

    const processNotReady = "the process is not ready";
    class LeisError extends Error { }
    class LeisProcessNotReady extends Error { }
    class UniqueType extends Error { }

    const errors = {
        LeisError,
        LeisProcessNotReady,
        UniqueType
    };
    const typeError = {
        listenerError: {
            exe: (type) => `type of ${typeof type} is not a callback function`
        },
        processNotReady: {
            name: processNotReady
        },
        uniqueTypeError: {
            exe: (type) => `the ${type.split(',')[0]} must be unique, the key ${type.split(',')[1]} already exists`
        }

    };
    /**
     * 
     * @param {'LeisError'|"LeisProcessNotReady"|"UniqueType"} error 
         * @param {'listenerError'|"processNotReady"|'uniqueTypeError' } message 
     */
    function DisplayError(error, message, type) {
        throw new errors[error](typeError[message].exe(type))
    }

    /**
     * **EventEmitter** in Leistrap
     * 
     * The `EventEmitter` is a core utility in Leistrap designed to create unique, bidirectional communication channels.
     * It facilitates asynchronous and fluid information sharing between various UI components and elements within the application. 
     * Thanks to its core methods, **`handle`** and **`invoke`**, the EventEmitter enables seamless event-driven communication 
     * between objects, promoting better decoupling and reusability.
     * 
     * - **Key Features**:
     *   - **`handle`**: Define a channel and attach a listener to it.
     *   - **`invoke`**: Trigger a channel, executing its attached listener if it exists.
     *   - **`removeEvent`**: Remove a channel if it's removable.
     *   - **`hasEvent`**: Check if a channel exists.
     *   - **`eventsList`**: Get a list of all registered channels.
     *   - **`clear`**: Cleanup all registered channels and events.
     */
    const lsEmitter = function (obj) {

        let channels = {};
        let inWaitChannel = {};
        let data = null;
        let isDestroyed = false;

        const event_ = { send: (d) => { data = d; } };

        function validateChannelName(channel) {
            if (!channel || typeof channel !== "string" || channel.trim() === "") {
                throw new EventEmitterError(
                    "Invalid channel name: The channel name must be a non-empty string.",
                    "INVALID_CHANNEL_NAME"
                );
            }
         }
        

         function checkState(){
            if(isDestroyed){
                throw new EventEmitterError(
                    "Operation failed: The EventEmitter instance has been destroyed.\n " +
                    "No further actions can be performed on this instance.\n " +
                    "Ensure you are not referencing a cleared or invalid EventEmitter object.\n",
                    "EVENT_DESTROYED"
                );
            }
         }

        class EventEmitterError extends Error {
            constructor(message, code) {
                super(message);
                this.name = "EventEmitterError";
                this.code = code; 
            }
        }


            
        /**
         * **`invoke`**: Trigger a channel and execute its listener.
         * 
         * This method is used to invoke a channel. If the channel does not exist yet, it is added to a queue 
         * and invoked as soon as it is defined via **`handle`**.
         * 
         * @param {string} channel - The name of the channel to invoke.
         * @param {function|null} [listener=null] - A callback function to execute immediately after the channel's listener 
         *                                          is invoked. This callback receives data sent from the channel's listener 
         *                                          through **`event.send(data)`**. Can be `null` if no additional processing is needed.
         * @param {...any} args - Additional arguments to pass to the channel's listener. These can include strings, arrays, 
         *                        objects, or asynchronous callbacks.
         * 
         * **Note**: It is recommended to use asynchronous callbacks if you need to handle complex operations.
         * 
         * **Example Usage**:
         * ```javascript
         * eventEmitter.invoke("myChannel", (data) => {
         *     console.log("Response from listener:", data);
         * }, "arg1", { key: "value" });
         * ```
         */
        async function invoke(channel, listener, ...args) {

            validateChannelName(channel);
        
            async function exe() {
                if ( !isDestroyed  && channels[channel]) {
                    await channels[channel].listener(event_, ...args);
                }
                if ( !isDestroyed && listener) listener(data);
                data = null;
            }
        
            if (!isDestroyed && obj.has(channel, channels)) {
                obj.after(1, exe);
            } else {
                if(!inWaitChannel[channel]) inWaitChannel[channel] = [];
                inWaitChannel[channel].push(() => obj.after(1, exe));
            }
        }



         /**
         * **`handle`**: Define a new channel and attach a listener to it.
         * 
         * This method is used to create a channel and listen for invocations on it via **`invoke`**.
         * 
         * @param {string} channel - The name of the channel to create.
         * @param {function} listener - The handler function to be called when the channel is invoked. 
         *                              The first parameter of this function must always be **`event`**, 
         *                              which is used to send immediate data to the listener via **`event.send(data)`**.
         *                              Additional parameters can be passed through **`...args`**.
         * @param {boolean} [removable=true] - Indicates whether the channel can be removed later using **`removeEvent`**. 
         *                                     Default is `true`. If set to `false`, the channel cannot be removed.
         * @param {boolean} [writable=true] - Defines whether the channel can be overwritten. Default is `true`. 
         *                                    If set to `false`, the channel becomes immutable and cannot be modified.
         * 
         * **Example Usage**:
         * ```javascript
         * eventEmitter.handle("myChannel", (event, data) => {
         *     console.log("Data received:", data);
         *     event.send({ success: true });
         * }, true, true);
         * ```
         */
        async function handle(channel, listener, removable = true, writable = true) {
            checkState();
            validateChannelName(channel);
        
            if (obj.has(channel, channels) && !channels[channel].writable) {
                throw new EventEmitterError(
                    `Cannot redefine the channel "${channel}" because it is marked as non-writable.`,
                    "NON_WRITABLE_CHANNEL"
                );
            }
        
            if (obj.has(channel, inWaitChannel)) {
                inWaitChannel[channel].forEach(function(item){
                    item();
                });
                delete inWaitChannel[channel];
            }

            channels[channel] = { listener, removable, writable };
        }
        

        
        /**
         * **`removeEvent`**: Remove a registered channel.
         * 
         * This method removes a channel from the EventEmitter. If the channel is not marked as **`removable`**, 
         * it will throw an error.
         * 
         * @param {string} channel - The name of the channel to remove.
         * @throws {Error} If the channel is not removable.
         * 
         * **Example Usage**:
         * ```javascript
         * eventEmitter.removeEvent("myChannel");
         * ```
         */
        function removeChannel(channel) {
            checkState();
            validateChannelName(channel);
        
            if (!obj.has(channel, channels)) {
                throw new EventEmitterError(
                    `Cannot remove the channel "${channel}" because it does not exist.`,
                    "CHANNEL_NOT_FOUND"
                );
            }
        
            if (!channels[channel].removable) {
                throw new EventEmitterError(
                    `Cannot remove the channel "${channel}" because it is marked as non-removable.`,
                    "NON_REMOVABLE_CHANNEL"
                );
            }
        
            delete channels[channel];
        

            if (obj.has(channel, inWaitChannel)) {
                delete inWaitChannel[channel];
            }
        
            if (data && data.channel === channel) {
                data = null;
            }
            
        }
        
        /**
         * **`clear`**: Cleanup all registered channels and events.
         * 
         * This method removes all channels, listeners, and pending events from the EventEmitter. 
         * It ensures that no memory leaks occur and that the EventEmitter can be safely discarded.
         * 
         * **Example Usage**:
         * ```javascript
         * eventEmitter.clear();
         * ```
         */

        function clear() {
            checkState();
            Object.keys(channels).forEach(channel => {
                delete channels[channel];
            });
        
      
            Object.keys(inWaitChannel).forEach(channel => {
                delete inWaitChannel[channel];
            });
            
            Object.keys(EVENTS).forEach(meth => {
                EVENTS[meth] = checkState;
            });

            data = null;
            EVENTS = null;
            channels = null;
            inWaitChannel = null;
            isDestroyed = true;
            return true
        }
        
        
         /**
         * **`eventsList`**: Get a list of all registered channels.
         * 
         * This method returns an array containing the names of all currently registered channels.
         * 
         * @returns {string[]} - Array of channel names.
         * 
         * **Example Usage**:
         * ```javascript
         * console.log("Registered channels:", eventEmitter.eventsList());
         * ```
         */
        let  eventsList  = ()=> Object.keys(channels);


            /**
         * **`hasEvent`**: Check if a channel exists.
         * 
         * This method verifies whether a channel is registered in the EventEmitter.
         * 
         * @param {string} channel - The name of the channel to check.
         * @returns {boolean} - Returns `true` if the channel exists, otherwise `false`.
         * 
         * **Example Usage**:
         * ```javascript
         * if (eventEmitter.hasEvent("myChannel")) {
         *     console.log("Channel exists!");
         * }
         * ```
         */
        let  hasEvent = (channel) => obj.has(channel, channels);


        let EVENTS =  {
            invoke,
            handle,
            removeEvent: removeChannel,
            removeChannel,
            hasEvent,
            eventsList,
            clear
        };

        return EVENTS
    };

    // maths operators

    function generateId(min = 0, max = 1) {
        const sy = "dh5263ayLogl";
        const num = "0123456789";
        const letters = "abcdefghijklmnopqrstuvwxyz";
        const lettUpc = letters.toLocaleUpperCase();
        const allItem = [sy, num, letters, lettUpc];
        let [res, i, y] = ["", 0, 0];
        const len = randint(min, max);

        while (y < len) {
            for (i = 0; i < allItem.length; i++) {
                let _c = allItem[Math.floor(Math.random() * allItem.length)];
                res += _c[Math.floor(Math.random() * _c.length)];
            }
            y++;
        }
        return res
    }

    function choice(obj) {

        if (typeof obj === "object") {
            const _bj = Object.keys(obj);
            return (obj[_bj[Math.floor(Math.random() * _bj.length)]]);
        }
        else if (
            typeof obj === "function"
            || typeof obj === "boolean"
            || typeof obj === "undefined"
            || typeof obj === "symbol"
        ) {
            throw new Error(`can not execute a ${typeof obj}`)
        }
        else if (typeof obj === "number") {
            const _n = [];
            for (let i = 0; i < obj; i++) { _n.push(i); }
            return _n[Math.floor(Math.random() * _n.length)]
        }
        else if (typeof obj === "string") {
            return obj[Math.floor(Math.random() * obj.length)]
        }
    }

    function randint(min, max) {

        if (typeof min === "number" && typeof max === "number") {
            const _p = [];
            for (let _x = min; _x < max; _x++) {
                _p.push(_x);
            }
            return choice(_p)

        }
        else {
            throw new Error(`can not execute ${typeof min !== "number" ? typeof min : typeof max}`)
        }
    }

    function splitData(data, step, proto = "length") {
        let temp = [];

        while (data[proto] > step) {
            temp.push(data.slice(data[proto] - step, data[proto]));
            data = data.slice(0, data[proto] - step);
        }

        if (data[proto] <= step) temp.push(data.slice());
        return temp
    }


    function inverseObject(_obj) {
        const result = {};
        loopObject(_obj, function (value, key) {
            result[value] = key;
        });
        return result
    }

    function rangeList(num, offset = 0, step = 1) {
        const result = [];
        for (let x = offset; x < num; x++) {
            if (x % step == 0) result.push(x);
        }
        return result
    }


    function isArray(obj) {
        return obj.constructor.toString().indexOf("Array") > -1
    }
    function isObject(obj) {
        return obj.constructor.toString().indexOf("Object") > -1;
    }

    function isString(obj) {
        if (typeof obj === "string") {
            return true
        }
        return obj instanceof String
    }

    function isFunction(obj) {
        return typeof obj === "function";
    }

    function isEmpty(obj) {
        return obj.length === 0 || Object.keys(obj).length === 0
    }

    function has(prop, obj) {
        return obj.indexOf ? obj.indexOf(prop) > -1 : obj.hasOwnProperty(prop)
    }
    function isTypeOf(prop, obj) {
        return prop instanceof obj
    }

    function copyObject(obj, target, overwrite = false, ...exp) {
        if (!target) { target = {}; }    if (!obj) { obj = {}; }    Object.keys(obj).forEach(item => {
            if (!(has(item, target) && !overwrite)) {
                if (!has(item, exp)) {
                    target[item] = obj[item];
                    if (isArray(target)) { target[item] = obj[item]; }
                }
            }
        });
        return target
    }

    function tryCode(callback, error) {
        try { callback(); } catch (e) { }
    }

    function after(s, func, ...args) {
        return setTimeout(func, s, args)
    }


    function loopObject(obj, callback = (value, key, index, finished) => value) {
        const result = [];
        if (obj) {
            let c = 0; let f = false;
            for (var x in obj) {
                c++;
                c === Object.keys(obj).length ? f = true :
                    f = false;
                callback(obj[x], x, c - 1, f);
                result.push(obj[x]);
            }
        }
        return result
    }


    function capitalize(value){
        if(typeof value === "string"){
            let cpv = value.slice(1);
            let cp = value[0].toUpperCase();
            return cp +cpv
        }

        return value
    }


    function toCamelKey (key){
        return key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    }

    function _EventEmitter(){
        return lsEmitter({ has, after, copyObject })
    }

    /**
     * 
     * @param {HTMLElement} parent 
     * @param {BaseElement} element 
     */
    function Render(parent, element) {

        setTimeout(function () {
            parent.append(element.render());
        }, 300);

    }

    const hooks = {

        // these hooks will be executed when an instance of leistrap is created
        useInit: [],
        // these hooks  will be executed when  we pass options to the new leistrap
        // instance just created
        useOption: [],
        // hooks which will be executed before an element rending
        useRender: [],
        /**
         * call a hook
         * @param { "useInit" |"useOption"|"useRender"} name 
         */
        callHook: function (name, DisplayError, ...argv) {
            this[name].forEach(hook => {
                if (isFunction(hook)) hook(...argv);
                else { DisplayError("LeisError", "listenerError", hook); }
            });
        }
    };

    function SetOptions(element, options, getObjectByIndexName) {
        if (!options.data) options.data = {};

        // get all eventType , all properties which begin with on
        const exp = ["data", "text", "content", "parent", "id", "autoClick"];
        loopObject(copyObject(options, false, false, ...exp), function (value, key) {
            if (key.startsWith("on") && typeof value == "function") {
                // split the key for getting the eventName and options passed
                let eventType = key.slice(2, key.length).split("$");
                element.addEvent(eventType[0], value, eventType[1], eventType[2]);
            }
            else {
                // now let assign all html properties not method
                // let begin we the string type, for example id, className etc...
                if (typeof element._conf[key] != "function") {
                    element._conf[key] = value;
                }
                
                //call a native function
                else {
                    if(typeof value == "object"){
                        if(isArray(value)) element._conf[key](...value);
                    }
                    else {element._conf[key](value);}
                }
                // get all css styles definition an other html properties require object as value
                if (isObject(value)) {
                    loopObject(value, (v, k) => element._conf[key][k] = v);
                }
            }
        });
        // const copyOptions = copyObject(options, false, false, '')
        if (options.content) {
            element.content = options.content;
            options.content.forEach((item, index) => item.parent = element);
        }

        if (options.parent) {
            if (isString(options.parent)) {
                getObjectByIndexName(options.parent,
                    true, parent => parent.add(element));
            }
            else { options.parent.add(element); }
        }

        if (options.text) element.setText(options.text);

        if (options.data.id) element.data.id = options.data.id;
        if(options.autoClick) element._conf.click();

        // clear all options  and save space
        setTimeout(() => {
            loopObject(options, function (value, key, i, end) {
                try {
                    delete options[key];
                } catch (error) {
                }

            });
        }, 2000);

    }

    var leistrapCss = "\r\n\r\n:root {\r\n\r\n    --leis-baseColor: #28a745;\r\n    --leis-chat-card-bg-cl: #f4eff8;\r\n    --leis-body-cl: #f8f8f8;\r\n      \r\n    --leis-sideNav-cl: hsla(0, 0%, 100%, 0.942);\r\n    --leis-sideNav-bx-sh: 0 2px 9px rgba(0, 0, 0, .16);\r\n    \r\n    --leis-highlight-cl: var(--leis-body-cl);\r\n    \r\n    --leis-txt-cl: hsla(0, 0%, 0%, 0.962);\r\n    --leis-txt-z-size : var(--leis-font-size);\r\n\r\n    \r\n    --leis-line-separator-cl: #d4d4da;\r\n    \r\n    --leis-default-cl: #f8f7fc;\r\n    --leis-default-selector: #f6f6f6;\r\n    \r\n    --leis-img-cd-cl: #f1f1f1;\r\n    --leis-subtitle-cl: rgb(152, 150, 150);\r\n    --leis-img-outline-cl: #aeaeae;\r\n\r\n    --leis-nav-cl: #fcfbfbcf;\r\n    --leis-nav-bx-sh: rgba(0, 0, 0, .16) 0px 1px 4px;\r\n\r\n  \r\n    \r\n    \r\n    --leis-effect-img: contrast(1.5) brightness(1.02) saturate(108%);\r\n    --leis-border-width: 1.2px;\r\n    --leis-border : var(--leis-border-width) solid #ddd; \r\n    --leis-heading-color: inherit;\r\n    --leis-font-sans-serif: system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", \"Noto Sans\", \"Liberation Sans\", Arial, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";\r\n    --leis-font-monospace: SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;\r\n    --leis-font-size: 1rem;\r\n    --leis-resize-cl: var(--leis-primary-cl);\r\n    --leis-select-cl: #f6f3f3a3;\r\n\r\n    --leis-title-cl : var(--leis-heading-color);\r\n    --leis-title-font-family : var(--leis-font-sans-serif);\r\n}\r\n\r\n\r\n/* reset padding and marging */\r\n.leis::before,\r\n.leisie::before,\r\n.leis::after,\r\n.leisie::after,\r\n.ls::after,\r\n.ls::before,\r\n.leis,\r\n.leisie,\r\n\r\n.ls {\r\n    padding: 0;\r\n    margin: 0;\r\n    box-sizing: border-box;\r\n}\r\n\r\nbutton,\r\ninput,\r\noptgroup,\r\nselect,\r\ntextarea {\r\n    margin: 0;\r\n    font-family: inherit;\r\n    font-size: inherit;\r\n    line-height: inherit\r\n}\r\n\r\nbutton,\r\nselect {\r\n    text-transform: none\r\n}\r\n\r\nhr {\r\n    margin: 1rem 0;\r\n    color: inherit;\r\n    border: 0;\r\n    border-top: var(--leis-border-width) solid;\r\n    opacity: .25\r\n}\r\n\r\nh1,\r\nh2,\r\nh3,\r\nh4,\r\nh5,\r\nh6,\r\nth {\r\n    margin-top: 0;\r\n    margin-bottom: .5rem;\r\n    font-weight: 500;\r\n    line-height: 1.2;\r\n    font-family: var(--leis-title-font-family);\r\n    color: var(--leis-title-cl)\r\n}\r\n\r\nth {\r\n    padding: 0 10px;\r\n}\r\n\r\n*,\r\n::after,\r\n::before {\r\n    box-sizing: border-box\r\n}\r\n\r\n* {\r\n    padding: 0;\r\n    margin: 0;\r\n    box-sizing: border-box;\r\n    position: relative;\r\n}\r\n/* *::-webkit-scrollbar {\r\n    height: 4px;\r\n    width: 10px;\r\n    cursor: default !important;\r\n\r\n} */\r\n/* *::-webkit-scrollbar-button{\r\n    background-color: var(--leis-baseColor);\r\n    width: 7px;\r\n    width: 7px;\r\n} */\r\n/* *::-webkit-scrollbar-thumb {\r\n    background-color: rgba(222, 217, 217, 0.541);\r\n    background-color: var(--leis-baseColor);\r\n} */\r\n\r\n\r\n\r\nbody {\r\n    color: var(--leis-txt-cl);\r\n    background-color: var(--leis-body-cl);\r\n    font-family: var(--leis-font-sans-serif);\r\n    font-weight: 400;\r\n    line-height: 1.5;\r\n    font-size: var(--leis-font-size);\r\n    -webkit-text-size-adjust: 100%;\r\n    text-size-adjust: 100%;\r\n    -webkit-tap-highlight-color: transparent;\r\n\r\n}\r\n\r\n[type=search] {\r\n    outline-offset: -2px;\r\n    -webkit-appearance: textfield\r\n}\r\n\r\n::-webkit-search-decoration {\r\n    -webkit-appearance: none\r\n}\r\n\r\n::-webkit-color-swatch-wrapper {\r\n    padding: 0\r\n}\r\n\r\n::-webkit-file-upload-button {\r\n    font: inherit;\r\n    -webkit-appearance: button\r\n}\r\n\r\nhtml {\r\n    scroll-behavior: smooth;\r\n}\r\n\r\n/* layout*/\r\n\r\n.leis-layout {\r\n    min-width: 100%;\r\n    min-height: 100%;\r\n\r\n}\r\n\r\n\r\n.leis-hbox-item {\r\n    position: relative;\r\n    font-size: inherit;\r\n    text-align: inherit;\r\n    min-height: 100%;\r\n}\r\n\r\n.leis-vbox-item {\r\n    position: relative;\r\n    min-width: 100%;\r\n    font-size: inherit;\r\n}\r\n\r\n/* flexbox */\r\n\r\n.leis-flex {\r\n    position: relative;\r\n    display: -webkit-box;\r\n    display: -ms-flexbox;\r\n    display: flex;\r\n    -webkit-box-orient: vertical;\r\n    -webkit-box-direction: normal;\r\n    -ms-flex-direction: column;\r\n    flex-direction: column;\r\n    min-width: 0;\r\n    word-wrap: break-word;\r\n    background-clip: border-box;\r\n    margin-bottom: 0.5em;\r\n\r\n}\r\n\r\n.leis-flex.leis-row,\r\n.leis-row {\r\n    -webkit-box-orient: horizontal;\r\n    -ms-flex-direction: row;\r\n    flex-direction: row;\r\n}\r\n\r\n.leis-flex.leis-column,\r\n.leis-colunm {\r\n    -webkit-box-orient: vertical;\r\n    -ms-flex-direction: column;\r\n    flex-direction: column;\r\n}\r\n\r\n.l-g-s {\r\n    gap: 0.5rem;\r\n}\r\n\r\n.l-g-n {\r\n    gap: 1rem;\r\n}\r\n\r\n.l-g-n {\r\n    gap: 1.5rem;\r\n}\r\n\r\n\r\n\r\n/* lines */\r\n\r\n.leis-line-h {\r\n    height: 0.5px;\r\n    outline: none;\r\n    border: none;\r\n    background-color: var(--leis-line-separator-cl);\r\n}\r\n\r\n/* cards */\r\n\r\n.leis-card,\r\n.leis-card-sms,\r\n.leis-dropdown,\r\n.leis-dropdown-content,\r\n.leis-alert-card,\r\n.leis-slideshow-container {\r\n    position: relative;\r\n    display: -webkit-box;\r\n    display: -ms-flexbox;\r\n    display: flex;\r\n    -webkit-box-orient: vertical;\r\n    -webkit-box-direction: normal;\r\n    -ms-flex-direction: column;\r\n    flex-direction: column;\r\n    min-width: 0;\r\n    word-wrap: break-word;\r\n    background-clip: border-box;\r\n    border: var(--leis-card-bd);\r\n    border-radius: 6px;\r\n    -webkit-box-shadow: var(--leis-card-bx-sh);\r\n    box-shadow: var(--leis-card-bx-sh);\r\n    margin-bottom: 0.5em;\r\n}\r\n\r\n\r\n\r\n/* calendar*/\r\n.leis-calendar-container {\r\n    position: relative;\r\n    width: 350px;\r\n    min-height: 350px;\r\n\r\n    padding: 0.5rem 0.5rem;\r\n    padding-top: 1rem;\r\n    margin: 0;\r\n    outline: none;\r\n    border: 1px solid #ddd;\r\n    background-color: #fff;\r\n    border-radius: 6px;\r\n    -webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);\r\n    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);\r\n}\r\n\r\n.leis-calendar {\r\n    position: relative;\r\n    left: -2px;\r\n    width: 100%;\r\n    padding: 0;\r\n\r\n}\r\n\r\n.leis-date {\r\n    text-align: center;\r\n    font-size: inherit;\r\n\r\n}\r\n\r\n.leis-date p {\r\n    width: 40px;\r\n    padding: 0.5rem 0;\r\n    border-radius: 5px;\r\n    font-weight: 500;\r\n    cursor: pointer;\r\n}\r\n\r\n.leis-date p.active {\r\n    background-color: #b9d6fcb2;\r\n}\r\n\r\n.leis-date p:hover {\r\n    background-color: #7f8d9e4d\r\n}\r\n\r\n.leis-date.active {\r\n    background-color: transparent;\r\n    color: inherit;\r\n}\r\n\r\n.leis-date.active.today p {\r\n    background-color: transparent;\r\n    color: inherit;\r\n    border: 2px solid rgba(255, 46, 46, 0.743);\r\n}\r\n\r\n.leis-calendar-day {\r\n    font-weight: 400;\r\n    text-align: left;\r\n}\r\n\r\n.leis-year-info {\r\n    position: relative;\r\n    margin-bottom: 1.5rem;\r\n    width: 100%;\r\n    display: flex;\r\n    justify-content: center;\r\n    align-content: flex-start;\r\n    gap: 0.5rem;\r\n    font-weight: 500;\r\n}\r\n\r\n.leis-date.today p {\r\n    background-color: rgba(255, 46, 46, 0.743);\r\n    color: #fff;\r\n    border-radius: 6px;\r\n}\r\n\r\n.calendar-next,\r\n.calendar-prev {\r\n    position: absolute;\r\n    top: 5px;\r\n    z-index: 1;\r\n    font-weight: 500;\r\n    outline: none;\r\n    border: none;\r\n    background-color: inherit;\r\n    color: inherit;\r\n    padding: 0.2rem 0.5rem;\r\n    cursor: pointer;\r\n}\r\n\r\n.calendar-next:hover,\r\n.calendar-prev:hover {\r\n    color: #0062cc;\r\n}\r\n\r\n.calendar-next {\r\n    right: 6px;\r\n}\r\n\r\n.calendar-prev {\r\n    left: 6px;\r\n}\r\n\r\n.leis-calendar-cover {\r\n    position: relative;\r\n    width: -moz-fit-content;\r\n    width: fit-content;\r\n    overflow: hidden;\r\n\r\n}\r\n\r\n/*\r\ncustom calendar\r\n*/\r\n\r\n.custom-calendar-container {\r\n    position: relative;\r\n    width: 320px;\r\n    height: auto;\r\n    overflow: hidden;\r\n    border: none;\r\n    outline: none;\r\n    padding: 0;\r\n    margin: 0;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n\r\n    background-color: inherit;\r\n\r\n}\r\n\r\n.custom-calendar-card {\r\n    position: relative;\r\n    width: 100%;\r\n    overflow: hidden;\r\n    border: 1px solid #ccc;\r\n    border-radius: 6px;\r\n    background-color: #fff;\r\n    padding: 1rem 0.5rem;\r\n}\r\n\r\n\r\n\r\n.custom-Date,\r\n.daysOff,\r\n.custom-header Div {\r\n    border: none;\r\n    outline: none;\r\n    width: 50px;\r\n    padding: 8px 5px;\r\n    border-radius: 5px;\r\n    font-weight: 500;\r\n    color: inherit;\r\n}\r\n\r\n.custom-Date {\r\n    cursor: pointer;\r\n}\r\n\r\n.custom-Date.active-date {\r\n    background-color: #287be9;\r\n    color: #fff;\r\n}\r\n\r\n.custom-Date:hover {\r\n    background-color: #abc9f0a4;\r\n}\r\n\r\n.custom-Date,\r\n.daysOff {\r\n    background-color: #ffffffa8;\r\n}\r\n\r\n.daysOff {\r\n    pointer-events: none;\r\n    color: #a39999;\r\n    opacity: 0.5;\r\n}\r\n\r\n.custom-body {\r\n    padding: 0;\r\n    width: 100%;\r\n    gap: 3px;\r\n    overflow: hidden;\r\n}\r\n\r\n.custom-row,\r\n.custom-header {\r\n    padding: 0;\r\n    margin: 0;\r\n    gap: 3px;\r\n\r\n}\r\n\r\n.custom-header Div {\r\n    font-weight: 400;\r\n}\r\n\r\n.custom-yearinfo {\r\n    width: 100%;\r\n    gap: 0.5rem;\r\n    justify-content: center;\r\n    font-weight: 500;\r\n}\r\n\r\n\r\n/* inputs*/\r\n\r\n\r\n\r\n/* leis group button*/\r\n\r\n.leis-groupBtn-container {\r\n    width: -moz-fit-content;\r\n    width: fit-content;\r\n    position: relative;\r\n}\r\n\r\n.leis-groupBtn-card,\r\n.leis-groupBtn-card.dark-group {\r\n    width: 100%;\r\n    padding: 5px 5px;\r\n    background-color: #2b3a49dc;\r\n    display: flex;\r\n    flex-direction: row;\r\n    flex-wrap: wrap;\r\n    gap: 0.255rem;\r\n    color: rgb(235, 225, 225);\r\n    border-radius: 6px;\r\n}\r\n\r\n.leis-groupBtn-item {\r\n    border-radius: none;\r\n    padding: 0 8px;\r\n    background-color: inherit;\r\n    font-size: inherit;\r\n    color: inherit;\r\n    outline: none;\r\n    border: none;\r\n    cursor: pointer;\r\n    border-radius: 4px;\r\n    white-space: nowrap;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n    transition: .3s ease;\r\n}\r\n\r\n.leis-groupBtn-item:hover,\r\n.leis-groupBtn-item.dark-group .leis-groupBtn-item:hover {\r\n    background-color: #6e6d6d;\r\n}\r\n\r\n.leis-groupBtn-item:focus,\r\n.leis-groupBtn-item.dark-group .leis-groupBtn-item:focus {\r\n    background-color: #fff;\r\n    background-color: #969292;\r\n    box-shadow: 0 0px 0px 2px rgba(0, 0, 0, 0.136);\r\n}\r\n\r\n.leis-groupBtn-card.light-group {\r\n    background-color: var(--leis-light-cl);\r\n    color: #000;\r\n    border: 1px solid #ddddddb5;\r\n}\r\n\r\n.leis-groupBtn-card.light-group .leis-groupBtn-item:not(:last-child) {\r\n    border-right: 1px solid #ddddddad;\r\n}\r\n\r\n.leis-groupBtn-card.light-group .leis-groupBtn-item:hover {\r\n    background-color: #e1dadaca;\r\n}\r\n\r\n.leis-groupBtn-card.light-group .leis-groupBtn-item:focus {\r\n    background-color: #e1dadab9;\r\n    box-shadow: 0 0px 0px 2px rgba(0, 0, 0, 0.136);\r\n}\r\n\r\n\r\n\r\n.leis-groupBtn-card.secondary-group {\r\n    background-color: var(--leis-secondary-hover-cl);\r\n    color: rgb(235, 225, 225);\r\n    border: 1px solid #ddddddb5;\r\n}\r\n\r\n.leis-groupBtn-card.secondary-group .leis-groupBtn-item:not(:last-child) {\r\n    border-right: 1px solid #bebcbcdf;\r\n}\r\n\r\n.leis-groupBtn-card.secondary-group .leis-groupBtn-item:hover {\r\n    background-color: rgb(183, 179, 179);\r\n    color: #fff;\r\n}\r\n\r\n.leis-groupBtn-card.secondary-group .leis-groupBtn-item:focus {\r\n    background-color: rgb(183, 179, 179);\r\n    color: #fff;\r\n    box-shadow: 0 0px 0px 2px rgba(0, 0, 0, 0.136);\r\n}\r\n\r\n\r\n\r\n.leis-groupBtn-card.primary-group {\r\n    background-color: var(--leis-primary-hover-cl);\r\n    color: rgb(235, 225, 225);\r\n    border: 1px solid #ddddddb5;\r\n}\r\n\r\n.leis-groupBtn-card.primary-group .leis-groupBtn-item:not(:last-child) {\r\n    border-right: 1px solid #bebcbcdf;\r\n}\r\n\r\n.leis-groupBtn-card.primary-group .leis-groupBtn-item:hover {\r\n    background-color: #4f8dd0;\r\n    color: #fff;\r\n}\r\n\r\n.leis-groupBtn-card.primary-group .leis-groupBtn-item:focus {\r\n    background-color: #4f8dd0;\r\n    color: #fff;\r\n    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.136);\r\n}\r\n\r\n.leis-groupBtn-card.success-group {\r\n    background-color: var(--leis-success-hover-cl);\r\n    color: #fff;\r\n    border: 1px solid #70d988;\r\n}\r\n\r\n.leis-groupBtn-card.success-group .leis-groupBtn-item:not(:last-child) {\r\n    border-right: 1px solid #70d988;\r\n}\r\n\r\n.leis-groupBtn-card.success-group .leis-groupBtn-item:hover {\r\n    background-color: #8deba2c4;\r\n    color: #000;\r\n}\r\n\r\n.leis-groupBtn-card.success-group .leis-groupBtn-item:focus {\r\n    background-color: #8deba2c4;\r\n    color: #000;\r\n    box-shadow: 0 0px 0px 2px rgba(0, 0, 0, 0.136);\r\n}\r\n\r\n\r\n.leis-groupBtn-card.warning-group {\r\n    background-color: hsla(45, 95%, 66%, 0.939);\r\n    color: #000;\r\n    border: 1px solid hsla(45, 95%, 66%, 0.939);\r\n}\r\n\r\n.leis-groupBtn-card.warning-group .leis-groupBtn-item:not(:last-child) {\r\n    border-right: 1px solid hsl(45, 64%, 82%);\r\n}\r\n\r\n.leis-groupBtn-card.warning-group .leis-groupBtn-item:hover {\r\n    background-color: hsla(45, 84%, 42%, 0.939);\r\n    color: #fff;\r\n}\r\n\r\n.leis-groupBtn-card.warning-group .leis-groupBtn-item:focus {\r\n    background-color: hsla(45, 84%, 42%, 0.939);\r\n    color: #fff;\r\n    box-shadow: 0 0px 0px 2px rgba(0, 0, 0, 0.136);\r\n}\r\n\r\n.leis-groupBtn-card.info-group {\r\n    background-color: #a6eaf5e9;\r\n    color: #000;\r\n    border: 1px solid #a6eaf5e9;\r\n}\r\n\r\n.leis-groupBtn-card.info-group .leis-groupBtn-item:not(:last-child) {\r\n    border-right: 1px solid #a6eaf5e9;\r\n}\r\n\r\n.leis-groupBtn-card.info-group .leis-groupBtn-item:hover {\r\n    background-color: #589faad1;\r\n    color: #fff;\r\n}\r\n\r\n.leis-groupBtn-card.info-group .leis-groupBtn-item:focus {\r\n    background-color: #589faad1;\r\n    color: #fff;\r\n    box-shadow: 0 0px 0px 2px rgba(0, 0, 0, 0.136);\r\n}\r\n\r\n\r\n.leis-groupBtn-card.danger-group {\r\n    background-color: #cf5662db;\r\n    color: #fff;\r\n    border: 1px solid #cf5662db;\r\n}\r\n\r\n.leis-groupBtn-card.danger-group .leis-groupBtn-item:not(:last-child) {\r\n    border-right: 1px solid #ddb2b6;\r\n}\r\n\r\n.leis-groupBtn-card.danger-group .leis-groupBtn-item:hover {\r\n    background-color: #a6464edb;\r\n    color: #fff;\r\n}\r\n\r\n.leis-groupBtn-card.danger-group .leis-groupBtn-item:focus {\r\n    background-color: #a6464edb;\r\n    color: #fff;\r\n    box-shadow: 0 0px 0px 2px rgba(0, 0, 0, 0.136);\r\n}\r\n\r\n/* Modal */\r\n\r\n.leis-modal-container {\r\n    display: none;\r\n    position: fixed;\r\n    top: 0;\r\n    left: 0;\r\n    width: 100%;\r\n    height: 100%;\r\n    background-color: hsla(0, 2%, 8%, 0.372);\r\n    overflow-x: hidden;\r\n    outline: 0;\r\n    z-index: 1000;\r\n}\r\n\r\n.leis-modal-dialog {\r\n    position: absolute;\r\n    top: 25%;\r\n    left: 50%;\r\n    padding: 0.5rem;\r\n    background-clip: padding-box;\r\n    background-color: #fff;\r\n    /* background-color: var(--leis-card-cl); */\r\n    border: 1px solid rgba(255, 255, 255, 0.15);\r\n    border-radius: 0.5rem;\r\n    box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);\r\n    outline: none;\r\n    animation: modal .3s ease;\r\n    width: 500px;\r\n    min-height: 250px;\r\n    height: 250px;\r\n\r\n\r\n}\r\n\r\n.modal-transform {\r\n    transform: translate(-50%, -25%);\r\n}\r\n\r\n.leis-modal-content {\r\n    width: 100%;\r\n    height: 100%;\r\n    padding: 10px 0;\r\n    position: relative;\r\n    background-color: inherit;\r\n\r\n}\r\n\r\n.leis-modal-container.show .leis-modal-dialog {\r\n    top: 25%;\r\n    transition: 1s ease;\r\n}\r\n\r\n.leis-modal-header {\r\n    display: flex;\r\n    flex-shrink: 0;\r\n    align-items: center;\r\n    justify-content: space-between;\r\n    border-bottom: 1px solid var(--leis-line-separator-cl);\r\n}\r\n\r\n.leis-modal-header .leis-modal-title {\r\n    padding: 5px 10px;\r\n}\r\n\r\n.leis-modal-header .leis-btn-close {\r\n    border: none;\r\n    font-size: 2rem;\r\n    top: -0.5rem;\r\n    left: -5px;\r\n    color: #999;\r\n    cursor: pointer;\r\n}\r\n\r\n.leis-modal-header .leis-btn-close:hover {\r\n    color: #000;\r\n}\r\n\r\n.leis-modal-body {\r\n    position: relative;\r\n    margin-left: 7px;\r\n    width: 100%;\r\n    height: calc(100% - 6rem - 4px);\r\n    position: relative;\r\n    overflow: hidden;\r\n    overflow-x: hidden;\r\n    overflow-y: auto;\r\n}\r\n\r\n.leis-modal-footer {\r\n    padding: 10px;\r\n    width: 100%;\r\n    position: absolute;\r\n    bottom: 0;\r\n    left: 0;\r\n    padding: 0;\r\n}\r\n\r\n.leis-modal-footer-card {\r\n    position: relative;\r\n\r\n    display: flex;\r\n    flex-shrink: 0;\r\n    flex-wrap: wrap;\r\n    align-items: center;\r\n    justify-content: flex-end;\r\n    padding: 0.6rem 1rem;\r\n    border-top: 1px solid var(--leis-line-separator-cl);\r\n    gap: 0.5rem;\r\n\r\n\r\n}\r\n\r\n.leis-modal-dafault {\r\n    padding: 3% 8%;\r\n}\r\n\r\n.leis-modal-dafault .leis-tooltip.bottom {\r\n    top: 80%;\r\n    left: 10%;\r\n}\r\n\r\n@keyframes modal {\r\n    from {\r\n        opacity: 0.1;\r\n        top: -320px;\r\n\r\n\r\n    }\r\n\r\n    top {\r\n        opacity: 1;\r\n        top: 25%;\r\n    }\r\n}\r\n\r\n@keyframes modal-zoom-in {\r\n    from {\r\n        opacity: 0.1;\r\n        transform: scale(2.5);\r\n    }\r\n\r\n    top {\r\n        opacity: 1;\r\n        transform: scale(1);\r\n    }\r\n}\r\n\r\n@keyframes modal-zoom-out {\r\n    from {\r\n        opacity: 0.1;\r\n        transform: scale(0.2);\r\n\r\n    }\r\n\r\n    top {\r\n        opacity: 1;\r\n        transform: scale(1);\r\n    }\r\n}\r\n\r\n/* slider*/\r\n\r\n.leis-slider-container {\r\n    position: relative;\r\n    background-color: var(--leis-dark-cl);\r\n    color: #fff;\r\n    height: 100vh;\r\n    width: 200px;\r\n}\r\n\r\n.leis-slider-content {\r\n    width: 100%;\r\n}\r\n\r\n.leis-slider-slider {\r\n    position: absolute;\r\n    top: 0;\r\n    right: 0;\r\n    background-color: inherit;\r\n    height: inherit;\r\n    width: 8px;\r\n    cursor: w-resize;\r\n    transition: background-color 1s ease;\r\n}\r\n\r\n.leis-slider-slider:hover {\r\n    background-color: #0069d9;\r\n\r\n}\r\n\r\n/* alerts*/\r\n\r\n.leis-alert-card {\r\n    position: relative;\r\n    box-shadow: none;\r\n    padding-right: 25px;\r\n}\r\n\r\n.leis-alert-card a {\r\n    white-space: nowrap;\r\n}\r\n\r\n.leis-alert-card .leis-btn-close {\r\n    position: absolute;\r\n    right: 10px;\r\n    top: 0px;\r\n    font-size: 2.5rem;\r\n    background-color: transparent;\r\n    border: none !important;\r\n}\r\n\r\n.leis-alert-card.leis-alert-primary {\r\n    background-color: #9ec8ff64;\r\n    border: 1.5px solid #74b0ff;\r\n\r\n\r\n}\r\n\r\n.leis-alert-card.leis-alert-success {\r\n    background-color: #96fbae6a;\r\n    border: 1.5px solid #51ff7abf;\r\n}\r\n\r\n.leis-alert-card.leis-alert-danger {\r\n    background-color: #fa919b77;\r\n    border: 1.5px solid #ff485ab2;\r\n}\r\n\r\n.leis-alert-card.leis-alert-info {\r\n    background-color: #a6f1fcae;\r\n    border: 1.5px solid #51a6b3a7;\r\n}\r\n\r\n.leis-alert-card.leis-alert-warning {\r\n    background-color: #ffdd7781;\r\n    border: 1.5px solid #ffce3ad5;\r\n}\r\n\r\n.leis-alert-card.leis-alert-dark {\r\n    background-color: #3f41437e;\r\n    color: rgb(250, 245, 245);\r\n}\r\n\r\n.leis-alert-card.leis-alert-light {\r\n    background-color: #fefeffb1;\r\n}\r\n\r\n.leis-alert-card.leis-alert-secondary {\r\n    background-color: #a0a1a25c;\r\n}\r\n\r\n.leis-alert-card .leis-alert-text {\r\n    padding: 16px;\r\n\r\n}\r\n\r\n/* groups */\r\n\r\n.leis-list-group,\r\n.leis-group,\r\n.leis-accordion-card {\r\n    display: -webkit-box;\r\n    display: -ms-flexbox;\r\n    display: flex;\r\n    -webkit-box-orient: vertical;\r\n    -webkit-box-direction: normal;\r\n    -ms-flex-direction: column;\r\n    flex-direction: column;\r\n    padding-left: 0;\r\n    margin-bottom: 0;\r\n}\r\n\r\n.leis-list-group {\r\n    list-style: none;\r\n}\r\n\r\n.leis-child-group {\r\n    padding: 2.5px 5px;\r\n    position: relative;\r\n\r\n}\r\n\r\n.leis-child-group:not(:last-child) {\r\n    border-bottom: 0.5px solid rgb(216, 212, 212);\r\n}\r\n\r\n.leis-group-head {\r\n    background-color: rgba(230, 227, 227, 0.744);\r\n    border-top-left-radius: 2px;\r\n    border-top-right-radius: 2px;\r\n}\r\n\r\n.leis-img-group-left {\r\n    display: block;\r\n    float: left;\r\n    width: 40px;\r\n    height: 40px;\r\n    border: none;\r\n    outline: none;\r\n    border-radius: 50%;\r\n    overflow: hidden;\r\n}\r\n\r\n.leis-img-group-left>.leis-img {\r\n    display: block;\r\n    width: 100%;\r\n    height: auto;\r\n    min-height: 40px !important;\r\n    border: none;\r\n    outline: none;\r\n    filter: var(--leis-effect-img);\r\n}\r\n\r\n.leis-img-group-left~.leis-group-txt {\r\n    padding: 12px 14px;\r\n    margin-left: 2.5rem;\r\n}\r\n\r\n/* -------------------------- badge---------------------------- */\r\n.leis-bg-primary {\r\n    background-color: var(--leis-primary-cl);\r\n}\r\n\r\n.leis-bg-secondary {\r\n    background-color: var(--leis-secondary-cl);\r\n}\r\n\r\n.leis-bg-succes {\r\n    background-color: var(--leis-success-cl);\r\n}\r\n\r\n.leis-bg-danger {\r\n    background-color: var(--leis-danger-cl);\r\n}\r\n\r\n.leis-bg-warning {\r\n    background-color: var(--leis-warning-cl);\r\n}\r\n\r\n.leis-bg-info {\r\n    background-color: var(--leis-info-cl);\r\n}\r\n\r\n.leis-bg-light {\r\n    background-color: var(--leis-light-cl);\r\n}\r\n\r\n.leis-bg-dark {\r\n    background-color: var(--leis-dark-cl);\r\n}\r\n\r\n\r\n/* web elements */\r\n\r\n\r\n\r\n\r\n.leis-accordion-btn::after,\r\n.leis-btn-controler::before,\r\n.leis-arrow-down::after {\r\n    position: relative;\r\n    content: \"\";\r\n    width: 10px;\r\n    height: 10px;\r\n    float: right;\r\n    top: 5px;\r\n    font-weight: 500;\r\n    font-size: 16px;\r\n    border-bottom: 1.8px solid;\r\n    border-left: 1.8px solid;\r\n    transform: rotateY(180deg) rotateZ(-40deg);\r\n    transition: .16s;\r\n}\r\n\r\n.leis-btn-controler {\r\n    color: #0069d9 !important;\r\n    position: absolute;\r\n    top: 8px;\r\n    left: 8px;\r\n    border: none;\r\n    z-index: 1;\r\n    background-color: inherit;\r\n}\r\n\r\n.leis-btn-controler.hide {\r\n    display: none;\r\n}\r\n\r\n.DA-close-modal {\r\n    position: absolute;\r\n    top: 15px;\r\n    left: 15px;\r\n    font-size: 1.5rem;\r\n    border-radius: 50%;\r\n}\r\n\r\n.DA-close-modal:hover {\r\n    background-color: #d31b2d;\r\n}\r\n\r\n.leis-btn-controler::before {\r\n    position: relative;\r\n    top: -1px;\r\n    border-bottom: 2.8px solid;\r\n    border-left: 2.8px solid;\r\n    transform: rotateY(180deg) rotateZ(-140deg);\r\n}\r\n\r\n.leis-accordion-btn.active::after,\r\n.leis-dropBtn.activeD .leis-arrow-down::after {\r\n    transform: rotateY(180deg) rotateZ(138deg);\r\n}\r\n\r\n.leis-accordion-btn:hover,\r\n.leis-accordion-btn.active {\r\n    background-color: var(--leis-light-hover-cl);\r\n}\r\n\r\n.leis-accordion-btn.active {\r\n    font-size: 18px;\r\n}\r\n\r\n\r\n.leis-accordion-btn:not(:last-child) {\r\n    border-bottom: 1.2px solid var(--leis-line-separator-cl);\r\n}\r\n\r\n\r\n.leis-accordion-panel {\r\n    position: relative;\r\n    background-color: inherit;\r\n    max-height: 0;\r\n    overflow: hidden;\r\n    transition: max-height 1s ease-in-out;\r\n}\r\n\r\n.leis-accordion-txt {\r\n    padding: 5px 14px;\r\n}\r\n\r\n.leis-accordion-panel.active {\r\n    max-height: 200vh;\r\n    overflow: visible;\r\n    background-color: #fff;\r\n}\r\n\r\n.leis-accordion-head {\r\n    width: 100%;\r\n    display: -webkit-box;\r\n    display: -moz-box;\r\n    display: block;\r\n    font-weight: 500;\r\n    background-color: var(--leis-accordion-head-cl);\r\n    padding: 12px 14px;\r\n    border-bottom: 1.5px solid var(--leis-line-separator-cl);\r\n    border-radius: 5px 5px 0px 0px;\r\n    color: var(--leis-accordion-head-txt-cl);\r\n}\r\n\r\n.leis-accordion-footer {\r\n    width: 100%;\r\n    display: -webkit-box;\r\n    display: -moz-box;\r\n    display: block;\r\n    padding: 5px 6px;\r\n    font-weight: 500;\r\n    border-radius: 0px 0px 5px 5px;\r\n    color: #000;\r\n    text-align: center;\r\n    -webkit-box-shadow: var(--leis-accordion-footer-bx-sh);\r\n    box-shadow: var(--leis-accordion-footer-bx-sh);\r\n    background-color: var(--leis-accordion-footer-cl);\r\n}\r\n\r\n/* collapsible*/\r\n\r\n.leis-collapsing-container {\r\n    position: relative;\r\n    border: none;\r\n    margin: 0;\r\n\r\n}\r\n\r\n.leis-collapse-btn {\r\n    border: none;\r\n    font-weight: 500;\r\n    text-align: left;\r\n    padding: 0;\r\n}\r\n\r\n.leis-collapse-btn::before {\r\n    position: absolute;\r\n    left: -15px;\r\n    top: 8px;\r\n    content: \"\";\r\n    width: 10px;\r\n    height: 10px;\r\n    border-bottom: 2px solid;\r\n    border-left: 2px solid;\r\n    transform: rotateY(-180deg) rotateZ(40deg);\r\n    transition: .16s;\r\n}\r\n\r\n.leis-collapsing {\r\n    max-height: 0;\r\n    overflow: hidden;\r\n    transition: max-height .45s ease\r\n}\r\n\r\n.leis-collapsing.callo-show {\r\n    max-height: 100%;\r\n\r\n}\r\n\r\n.leis-collapse-btn.colla-btn-show::before {\r\n    transform: rotateY(-180deg) rotateZ(-40deg);\r\n}\r\n\r\n\r\n\r\n\r\n\r\n/*ToolTip*/\r\n.leis-tooltip {\r\n    visibility: hidden;\r\n    position: absolute;\r\n    border-radius: 8px;\r\n    opacity: 0;\r\n    padding: 10px;\r\n    border: 1px solid #ddd;\r\n    background-color: var(--leis-body-cl);\r\n    width: -moz-fit-content;\r\n    width: fit-content;\r\n    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);\r\n    transition: opacity .3s ease;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n}\r\n\r\n.leis-tooltip::after {\r\n    content: \"\";\r\n    position: absolute;\r\n    width: 12px;\r\n    height: 12px;\r\n    background-color: inherit;\r\n    top: 100%;\r\n    left: 50%;\r\n    margin-top: -5px;\r\n    border-left: inherit;\r\n    border-top: inherit;\r\n    transform: rotateY(180deg) rotateZ(-140deg);\r\n}\r\n\r\n.leis-tooltip.top {\r\n    bottom: calc(100% + 10px);\r\n    left: 50%;\r\n}\r\n\r\n.leis-tooltip.bottom {\r\n    top: calc(100% + 10px);\r\n    left: calc(100% - 60%);\r\n}\r\n\r\n.leis-tooltip.bottom::after {\r\n    top: -3px;\r\n    left: calc(100% - 60%);\r\n    width: 15px;\r\n    height: 15px;\r\n    transform: rotateY(180deg) rotateZ(40deg);\r\n}\r\n\r\n.leis-tooltip.right {\r\n    bottom: calc(50% - 10px);\r\n    left: calc(100% + 10px);\r\n    min-width: 140px;\r\n}\r\n\r\n.leis-tooltip.right::after {\r\n    top: 50%;\r\n    left: -8px;\r\n    width: 14px;\r\n    transform: rotateY(180deg) rotateZ(130deg);\r\n}\r\n\r\n.leis-tooltip.left {\r\n    bottom: calc(50% - 10px);\r\n    right: calc(100% + 10px);\r\n    min-width: 140px;\r\n}\r\n\r\n.leis-tooltip.left::after {\r\n    top: 50%;\r\n    left: 100%;\r\n    margin-left: -5px;\r\n    transform: rotateY(180deg) rotateZ(-50deg);\r\n}\r\n\r\n.leis-tooltip .leis-tooltip-content {\r\n    max-width: 350px;\r\n    max-height: 50vh;\r\n    overflow: hidden;\r\n    overflow-x: hidden;\r\n    overflow-y: auto;\r\n}\r\n\r\n.leis-tooltip * {\r\n    padding: 0;\r\n    margin: 0;\r\n}\r\n\r\n\r\n/*search Bar*/\r\n\r\n.leis-searchBar,\r\n.leis-textinput {\r\n    width: 100%;\r\n    outline: none;\r\n    border: 1px solid #ddd;\r\n    padding: 3px 12px;\r\n    border-radius: 6px;\r\n\r\n}\r\n\r\n.leis-searchBar:focus,\r\n.leis-textinput:focus {\r\n    -webkit-box-shadow: 0 0 0 .25rem rgba(13, 110, 253, .25);\r\n    box-shadow: 0 0 0 .25rem rgba(13, 110, 253, .25);\r\n    filter: brightness(100%);\r\n}\r\n\r\n\r\n/*autocomplate*/\r\n\r\n.leis-autoComplate,\r\n.leis-textbox-container {\r\n    width: -moz-fit-content;            \r\n    width: fit-content;\r\n    padding: none;\r\n    margin: 0;\r\n}\r\n\r\n.leis-autoComplate .leis-group * {\r\n    border: none;\r\n    padding: 0;\r\n}\r\n\r\n.leis-autoComplate .leis-group .leis-child-group {\r\n    padding: 6px 10px;\r\n    cursor: pointer;\r\n    border: 1px solid #f6f3f3a3;\r\n    display: flex;\r\n    gap: 10px;\r\n}\r\n\r\n.aut-item-subTitle {\r\n    color: var(--leis-subtitle-cl);\r\n    font-size: calc(var(--leis-font-size) - 1px);\r\n}\r\n\r\n.leis-autoComplate .leis-group .leis-child-group:hover {\r\n    background-color: var(--leis-select-cl)\r\n}\r\n\r\n.leis-autoComplateCard {\r\n    visibility: hidden;\r\n}\r\n\r\n\r\n.leis-autoComplateCard.clicked:hover {\r\n    visibility: visible;\r\n}\r\n\r\n.leis-autoComplateCard.empty {\r\n    padding: 0;\r\n    border: 0;\r\n    margin: 0;\r\n}\r\n\r\n.leis-searchBar:focus+.leis-autoComplateCard,\r\n.leis-autoInput:focus+.leis-autoComplateCard {\r\n    visibility: visible;\r\n}\r\n\r\n.leis-autComplate-container {\r\n    width: 100%;\r\n    position: absolute;\r\n    border: 1px solid #ddd;\r\n    background-color: #fff;\r\n    border-radius: 6px;\r\n    z-index: 1000;\r\n    -webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);\r\n    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15)\r\n}\r\n\r\n/* TopNav */\r\n.leis-icon-menu {\r\n    position: relative;\r\n    display: inline-block;\r\n    width: 20px;\r\n    height: 2.5px;\r\n    left: -0.5px;\r\n    padding: 0;\r\n    margin: 0;\r\n    background-color: var(--leis-txt-cl);\r\n    transition: .5s ease-in;\r\n}\r\n\r\n.leis-icon-menu::after {\r\n    position: absolute;\r\n    top: -4px;\r\n    left: -0px;\r\n    margin-left: -0.5px;\r\n    display: inline-block;\r\n    content: \"\";\r\n    width: inherit;\r\n    height: inherit;\r\n    margin-bottom: 0.5px;\r\n    background-color: inherit;\r\n}\r\n\r\n.leis-icon-menu::before {\r\n    position: absolute;\r\n    display: inline-block;\r\n    top: -8px;\r\n    left: -0.5px;\r\n    content: \"\";\r\n    width: inherit;\r\n    height: inherit;\r\n    margin-bottom: 0.5px;\r\n    background-color: inherit;\r\n}\r\n\r\n.leis-icon-menu.clicked {\r\n    transform: rotateZ(-150deg);\r\n}\r\n\r\n.leis-icon-menu.clicked::after {\r\n    transform: rotateZ(90deg);\r\n    top: 0px;\r\n    left: 0.5px;\r\n}\r\n\r\n.leis-icon-menu.clicked::before {\r\n    transform: rotateZ(40deg);\r\n    background-color: transparent;\r\n}\r\n\r\n.leis-topnav {\r\n    position: relative;\r\n    font-size: 18px;\r\n    width: 100%;\r\n    height: 50px;\r\n    border-bottom: 1px solid #eee;\r\n    -webkit-box-shadow: var(--leis-nav-bx-sh);\r\n    box-shadow: var(--leis-nav-bx-sh);\r\n    margin: 0;\r\n}\r\n\r\n\r\n.leis-topnav.primary,\r\n.leis-topnav.primary .leis-dropBtn {\r\n    background-color: var(--leis-primary-hover-cl);\r\n    color: rgba(230, 227, 227, 0.991) !important;\r\n}\r\n\r\n\r\n\r\n.leis-topnav .leis-dropBtn,\r\n.leis-topnav .leis-dropBtn.activeD {\r\n    width: auto;\r\n    border: none;\r\n    outline: none;\r\n    box-shadow: none;\r\n    font-size: 18px;\r\n    text-align: left;\r\n    padding: 0;\r\n    margin: 0;\r\n    display: inline-block;\r\n    padding-top: 4px;\r\n    font-weight: 300;\r\n}\r\n\r\n.leis-topnav .leis-dropdown-content.show {\r\n    z-index: 1000;\r\n    min-width: 200px;\r\n    color: #000 !important;\r\n}\r\n\r\n.leis-topnav .leis-dropBtn {\r\n    display: flex;\r\n    gap: 10px;\r\n}\r\n\r\n.leis-topnav .leis-dropBtn.activeD .leis-arrow-down::after {\r\n    left: 10px;\r\n}\r\n\r\n.leis-topnav .leis-dropBtn .leis-arrow-down::after {\r\n    height: 6px;\r\n    width: 6px;\r\n\r\n}\r\n\r\n.leis-topnav.primary .leis-child-group:hover,\r\n.leis-topnav.primary .leis-dropBtn:hover {\r\n    color: #fff !important\r\n}\r\n\r\n.leis-topnav.secondary,\r\n.leis-topnav.secondary .leis-dropBtn {\r\n    background-color: var(--leis-secondary-cl);\r\n    color: rgba(230, 227, 227, 0.991) !important;\r\n}\r\n\r\n.leis-topnav.secondary .leis-child-group:hover,\r\n.leis-topnav.secondary .leis-dropBtn {\r\n    color: #fff !important\r\n}\r\n\r\n.leis-topnav.warning,\r\n.leis-topnav.warning .leis-dropBtn {\r\n    background-color: var(--leis-warning-cl);\r\n    color: #221e1e !important\r\n}\r\n\r\n.leis-topnav.warning .leis-child-group:hover,\r\n.leis-topnav.warning .leis-dropBtn:hover {\r\n    color: #000 !important\r\n}\r\n\r\n.leis-topnav.dark,\r\n.leis-topnav.dark .leis-dropBtn {\r\n    background-color: var(--leis-dark-cl);\r\n    color: rgb(216, 212, 212) !important\r\n}\r\n\r\n.leis-topnav.dark .leis-child-group:hover,\r\n.leis-topnav.dark .leis-dropBtn:hover {\r\n    color: #fff !important\r\n}\r\n\r\n\r\n.leis-topnav.light,\r\n.leis-topnav.light .leis-dropBtn {\r\n    background-color: var(--leis-light-cl);\r\n    color: #3c3939 !important\r\n}\r\n\r\n.leis-topnav.light .leis-child-group:hover,\r\n.leis-topnav.light .leis-dropBtn:hover {\r\n    color: var(--leis-primary-cl) !important\r\n}\r\n\r\n\r\n.leis-topnav.success,\r\n.leis-topnav.success .leis-dropBtn {\r\n    background-color: var(--leis-success-cl);\r\n    color: rgb(216, 212, 212) !important\r\n}\r\n\r\n.leis-topnav.success .leis-child-group:hover,\r\n.leis-topnav.success .leis-dropBtn:hover {\r\n    color: #fff\r\n}\r\n\r\n.leis-topnav.danger,\r\n.leis-topnav.danger .leis-dropBtn {\r\n    background-color: var(--leis-danger-cl);\r\n    color: rgb(216, 212, 212) !important\r\n}\r\n\r\n.leis-topnav.danger .leis-child-group:hover,\r\n.leis-topnav.danger .leis-dropBtn:hover {\r\n    color: #fff\r\n}\r\n\r\n.leis-topnav.info,\r\n.leis-topnav.info .leis-dropBtn {\r\n    background-color: var(--leis-info-cl);\r\n    color: #333 !important\r\n}\r\n\r\n.leis-topnav.info .leis-child-group:hover,\r\n.leis-topnav.info .leis-dropBtn:hover {\r\n    color: #000 !important\r\n}\r\n\r\n.leis-topnav-cd-profil-right {\r\n    display: block;\r\n    float: right;\r\n}\r\n\r\n.leis-topnav .leis-list-group {\r\n    display: inline-block;\r\n    padding: 10px 16px;\r\n    margin: 0;\r\n    display: flex;\r\n    flex-direction: row;\r\n    gap: 0.8rem;\r\n}\r\n\r\n.leis-topnav .leis-list-group .leis-img-group-left {\r\n    display: inline-block;\r\n    width: 30px;\r\n    height: 30px;\r\n    margin: 5 auto;\r\n}\r\n\r\n.leis-topnav .leis-group .leis-dropdown {\r\n    background-color: red;\r\n}\r\n\r\n\r\n\r\n.profil {\r\n    padding: 0 !important;\r\n    margin: 0 !important;\r\n}\r\n\r\n.leis-topnav .leis-list-group .leis-img-group-left img {\r\n    min-height: 30px;\r\n}\r\n\r\n.leis-topnav .leis-list-group .leis-child-group {\r\n    margin: 0;\r\n    border: none;\r\n    outline: none;\r\n    padding: 2.5px 2.5px 0 0;\r\n}\r\n\r\n.leis-topnav .leis-list-group .leis-child-group * {\r\n    text-decoration: none;\r\n    color: inherit;\r\n\r\n}\r\n\r\n@media screen and (max-width:600px) {\r\n\r\n    .leis-topnav a:not(:first-child) {\r\n        display: none;\r\n    }\r\n\r\n    .leis-topnav a.icon {\r\n        float: right;\r\n        display: block;\r\n\r\n    }\r\n\r\n    .leis-topnav.responsive a.icon {\r\n        position: absolute;\r\n        top: 0;\r\n        right: 0;\r\n    }\r\n\r\n    .leis-topnav.responsive a {\r\n        float: none;\r\n        display: block;\r\n        text-align: left;\r\n    }\r\n}\r\n\r\n/* SideNav */\r\n.leis-sideNav {\r\n    padding: 10px;\r\n    height: 100%;\r\n    width: 250px;\r\n    position: fixed;\r\n    overflow: hidden;\r\n    z-index: 100;\r\n    top: 0;\r\n    left: 0;\r\n    background-color: var(--leis-dark-cl);\r\n    overflow-x: hidden;\r\n    transition: 0.5s;\r\n    -webkit-box-shadow: var(--leis-sideNav-bx-sh);\r\n    box-shadow: var(--leis-sideNav-bx-sh);\r\n    border-right: 1.8px solid var(--leis-default-cl);\r\n}\r\n\r\n.leis-sideNav .leis-collapsing-container * {\r\n    color: inherit;\r\n}\r\n\r\n.leis-sideNav .leis-list-group * {\r\n    font-weight: 400;\r\n}\r\n\r\n.leis-sideNav .leis-collapsing-container .leis-collapse-btn {\r\n    padding-left: 20px;\r\n    font-size: inherit;\r\n    font-weight: inherit;\r\n}\r\n\r\n.leis-sideNav .leis-collapsing-container .leis-collapse-btn::before {\r\n    left: 0;\r\n}\r\n\r\n.leis-sideNav .leis-collapsing-container .leis-collapse-btn.colla-btn-show {\r\n    font-weight: 400;\r\n    color: #dad6d6e8;\r\n}\r\n\r\n.leis-sideNav .leis-collapsing-container .leis-collapse-btn:hover {\r\n    color: #ede7e7;\r\n}\r\n\r\n.leis-sideNav a {\r\n    text-decoration: none;\r\n    color: inherit;\r\n    font-size: inherit;\r\n    font-family: inherit;\r\n}\r\n\r\n.leis-sideNav .leis-list-group.links {\r\n    max-height: 75vh;\r\n    overflow: hidden;\r\n    overflow-x: hidden;\r\n    overflow-y: auto;\r\n}\r\n\r\n.leis-sideNav .leis-list-group::-webkit-scrollbar {\r\n    height: 4px;\r\n    width: 8px;\r\n    cursor: default !important;\r\n\r\n}\r\n\r\n.leis-sideNav .leis-list-group::-webkit-scrollbar-thumb {\r\n    background-color: rgba(222, 217, 217, 0.541);\r\n}\r\n\r\n.leis-sideNav .leis-list-group .leis-child-group {\r\n    padding: 8.5px 6px;\r\n    font-size: 1.1rem;\r\n    font-family: inherit;\r\n    border-radius: 8px;\r\n    border: none;\r\n    color: rgb(216, 212, 212);\r\n    cursor: pointer;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n    display: flex;\r\n    justify-content: start;\r\n    gap: 13px;\r\n}\r\n\r\n.leis-sideNav .leis-list-group .leis-child-group.active {\r\n    background-color: inherit;\r\n\r\n}\r\n\r\n.leis-sideNav .leis-collapsing-container .leis-list-group .leis-child-group {\r\n    padding: 3px 1.5px;\r\n}\r\n\r\n.leis-sideNav .leis-collapsing-container .leis-list-group {\r\n    padding-left: 15px;\r\n}\r\n\r\n.leis-sideNav .sideNavHeader {\r\n    padding: 5px 5px;\r\n    color: #fff;\r\n    font-size: 1.5rem;\r\n    margin-bottom: 1rem;\r\n    padding-bottom: 1.5rem;\r\n    border-bottom: 1.5px solid #6860609f;\r\n}\r\n\r\n.leis-sideNav .sideNavFooter {\r\n    position: absolute;\r\n    bottom: 0;\r\n    left: 0;\r\n    width: 100%;\r\n    padding: 10px 10px;\r\n    color: #fff;\r\n    font-size: 1.5rem;\r\n    padding-top: 1rem;\r\n    border-top: 1.5px solid #6860609f;\r\n\r\n}\r\n\r\n\r\n\r\n.leis-sideNav .leis-list-group .leis-child-group:not(.colla-item):hover {\r\n    background-color: #98c3f16b;\r\n}\r\n\r\n.leis-sideNav .leis-list-group .leis-child-group.sideItemActive {\r\n    background-color: #0069d9;\r\n    color: #fff;\r\n}\r\n\r\n\r\n.leis-sideNav a:hover {\r\n    background-color: var(--leis-light-hover-cl);\r\n}\r\n\r\n.leis-sideNav .leis-close-btn {\r\n    position: absolute;\r\n    top: 0;\r\n    right: 0;\r\n    font-size: 35px;\r\n    margin-left: 50px;\r\n}\r\n\r\n\r\n.leis-openSide,\r\n.leis-Closeside {\r\n    position: relative;\r\n    display: inline-block\r\n}\r\n\r\n@media screen and(max-height:450px) {\r\n    .leis-sideNav {\r\n        padding: 15px;\r\n    }\r\n\r\n    .leis-sideNav a {\r\n        font-size: 18px;\r\n    }\r\n}\r\n\r\n/* dropdown btn */\r\n\r\n\r\n.leis-dropdown,\r\n.leis-slideshow-container {\r\n    position: relative;\r\n    border: none;\r\n    outline: none;\r\n    box-shadow: none;\r\n}\r\n\r\n.leis-dropdown {\r\n    display: inline-block;\r\n}\r\n\r\n.leis-dropdown-content {\r\n    display: none;\r\n    position: absolute;\r\n    top: -8px;\r\n    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, .2) !important;\r\n    z-index: 1;\r\n    animation: fade .16s ease-in;\r\n}\r\n\r\n.leis-dropdwn-content-card {\r\n    position: relative;\r\n    max-height: 350px;\r\n    min-width: 100px;\r\n    overflow-y: auto;\r\n    overflow-x: hidden;\r\n}\r\n\r\n.leis-content {\r\n    width: 100%;\r\n    position: relative;\r\n}\r\n\r\n.leis-content>.leis-dropdown-content {\r\n    width: 100%;\r\n}\r\n\r\n.leis-dropdown-content a {\r\n    color: black;\r\n    padding: 12px 16px;\r\n    display: block;\r\n}\r\n\r\n.leis-dropdwn-content-card>* {\r\n    display: block;\r\n}\r\n\r\n.hide {\r\n    display: none;\r\n}\r\n\r\n.show {\r\n    display: block;\r\n}\r\n\r\n/* Page */\r\n\r\n.leis-mainPage {\r\n    position: relative;\r\n    padding-top: 30px;\r\n    min-width: 100%;\r\n}\r\n\r\n.leis-page-content {\r\n    position: relative;\r\n    display: none;\r\n    animation: fr .4s ease-in-out\r\n}\r\n\r\n@keyframes fr {\r\n    from {\r\n        transform: scale(0.5);\r\n        opacity: 0;\r\n    }\r\n\r\n    to {\r\n        transform: scale(1);\r\n        opacity: 1;\r\n    }\r\n}\r\n\r\n.leis-page-legende {\r\n    cursor: pointer;\r\n}\r\n\r\n/* slideshow/ carousel */\r\n\r\n.leis-slideshow-container {\r\n    padding: 0;\r\n    margin: 0;\r\n    max-width: 1000px;\r\n    margin: auto;\r\n    overflow: hidden;\r\n}\r\n\r\n.leis-slideshow-container .leis-img-card {\r\n    width: 100%;\r\n    height: inherit;\r\n    padding: 0;\r\n    margin: 0;\r\n    position: relative;\r\n    display: none;\r\n\r\n}\r\n\r\n.leis-slideshow-container .leis-img-card .leis-img {\r\n    width: 100%;\r\n    height: auto;\r\n    max-height: calc(100%);\r\n}\r\n\r\n.leis-slideshow-prev-btn,\r\n.leis-slideshow-next-btn {\r\n    cursor: pointer;\r\n    position: absolute;\r\n    top: 50%;\r\n    padding: 10px;\r\n    color: white;\r\n    font-weight: bold;\r\n    font-size: 18px;\r\n    transition: 0.6s ease;\r\n    border-radius: 0 3px 3px 0;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n    z-index: 1;\r\n}\r\n\r\n.leis-slideshow-prev-btn {\r\n    left: 0;\r\n}\r\n\r\n.leis-slideshow-next-btn {\r\n    right: 0;\r\n    border-radius: 3px 0 0 3px;\r\n}\r\n\r\n.leis-slideshow-next-btn:hover,\r\n.leis-slideshow-prev-btn:hover {\r\n    background-color: rgba(0, 0, 0, 0.8);\r\n}\r\n\r\n.leis-slideshow-txt {\r\n    color: #f2f2f2;\r\n    font-size: 18px;\r\n    position: absolute;\r\n    padding: 8px;\r\n    left: 0;\r\n    bottom: 0;\r\n    width: 100%;\r\n    text-align: center;\r\n    background-color: rgba(0, 0, 0, 0.479);\r\n    z-index: 1;\r\n}\r\n\r\n.leis-slideshowNumTxt {\r\n    position: absolute;\r\n    color: #f2f2f2;\r\n    font-size: 17px;\r\n    padding: 8px 12px;\r\n    top: 0;\r\n}\r\n\r\n.leis-slideshow-dot {\r\n    cursor: pointer;\r\n    height: 15px;\r\n    width: 15px;\r\n    margin: 0 2px;\r\n    background-color: #bbb;\r\n    border-radius: 50%;\r\n    display: inline-block;\r\n    transition: background-color 0.6s ease\r\n}\r\n\r\n.active,\r\n.leis-slideshow-dot:hover {\r\n    background-color: #717171;\r\n}\r\n\r\n.fade {\r\n    animation-name: fade;\r\n    animation-duration: 1.5s;\r\n}\r\n\r\n.leis-firstSlideShow {\r\n    word-wrap: break-word;\r\n}\r\n\r\n@keyframes fade {\r\n    from {\r\n        opacity: .4;\r\n    }\r\n\r\n    to {\r\n        opacity: 1;\r\n    }\r\n}\r\n\r\n\r\n/* slideshow gallery */\r\n/* ---------------------- */\r\n\r\n/* modal image */\r\n\r\n\r\n/* dispay */\r\n.leis-flex {\r\n    display: flex;\r\n}\r\n\r\n.leis-gap-5 {\r\n    gap: 5px;\r\n}\r\n\r\n*:hover>.leis-tooltip {\r\n    visibility: visible;\r\n    opacity: 1;\r\n    z-index: 1001;\r\n}";

    const leistrap = (function () {

        // checks if the document is created before to execute any code
        let state = false;

        // all extensions 
        let extensionMap = {};

        // all leistrap configurations
        let setting = {};

        //elements to hide when the window is click
        let hideWin = [];

        // the main leistrap  event channels
        const mainEvent = _EventEmitter();
        const indexedElementEvent = _EventEmitter();
        // contains all leistrap object 
        let leisElementMap = {};

        class BaseElement {
            constructor(element) {
                /*** @type {HTMLLinkElement}*/
                this._conf = element;

                // the unique leistrap object key
                this.key = generateId(5, 10);

                // contains all children
                /**@type{Array<BaseElement>}*/
                this.content = [];
                this.contentMap = {};
                /**
                 * thes element state
                 * @type {{
                 * rendered : boolean, 
                 * }}
                 */
                this.state = {visible: true};
                /**@type {BaseElement} */
                this.parent = null;
                this.eventMap = {};
                /** the local data  */
                this.data = {
                    indexName: null,
                    element: this,
                    get id() { return this.indexName },
                    set id(value) {
                        indexedElementEvent.handle(value, e => e.send(this.element), true, false)
                            .then(() => this.indexName = value);
                    }
                };
                // the object eventEmiter interface
                this.event = _EventEmitter();
                this.eventListeners = {};

                //handle all event 
                this.once = function (e, listener) {
                    if (!has(e, this.eventListeners)) this.eventListeners[e] = [];
                    this.eventListeners[e].push(listener);
                    return this
                };
                // associate the leistrap object to the htmlElement
                this._conf.currentElement = this;

                // call all useInit Hooks and pass the this as parameter
                hooks.callHook("useInit", DisplayError, this);

            }


            render() {

                if (!this.state.rendered) {
                    // render all children
                    this.content.forEach(child => {
                        if (child.parent.key === this.key) {
                            this.contentMap[child.key] = child;
                            this._conf.append(child.render());
                        }

                    });


                    //  execute all  useRender hoos
                    hooks.callHook("useRender", DisplayError, this);

                    // set the object key as id to the element 
                    this._conf.id = this.key;
                    this.state.rendered = true;

                    // call all render eventListeners
                    handleAllEvent("render", this.eventListeners, this);
               
                    
                }

                return this._conf
            }

            /**
             * 
             * @param {BaseElement} element 
             * @returns this
             */
            add(elementObject) {
                let element = getObjectByIndexName(elementObject, true, (e) => this.add(e));
                handleAllEvent("add", this.eventListeners, this, 10, element);
                if (isTypeOf(element, BaseElement)) {
                    element.parent = this;
                    this.contentMap[element.key] = element;
                    this._conf.append(element.render());
                    this.content.push(element);
                    return this
                }
                return this
            }

            // destroy the leistrap object and remove the element from the DOM
            destroy() {
                setTimeout(() => {

                    // call all destroy events listeners
                    handleAllEvent("destroy", this.eventListeners, this);

                    // check if the object has a indexedElementEvent channel and then
                    // remove this channel from the indexedElementEvent object 
                    if (this.data.id) indexedElementEvent.removeEvent(this.data.id);

                    // remove the object from leisElementMap object 
                    delete leisElementMap[this.key];

                    // remove the leistrap object from the parent object
                    if (has(this.key, this.parent.contentMap)) {
                        delete this.parent.contentMap[this.key];
                        this.parent.content = loopObject(this.parent.contentMap);

                        // remove the object from the DOM
                        this.parent._conf.removeChild(this._conf);

                        // clear the object and save memory
                        setTimeout(() => {
                            loopObject(this, (value, key) => { delete this[key]; });
                        }, 1000);
                    }
                }, 100);
                return this
            }

            /**
             * allows to remove a child object
             * @param {BaseElement} element 
             */
            remove(element) {
                if (isString(element)) {
                    getObjectByIndexName(element, true, child => child.destroy());
                }
                else { element.destroy(); }
                return this
            }

            removeAll(listener) {
                setTimeout(() => {
                    let counter = 0;
                    let len = this.content.length;
                    let allElem = loopObject(this.contentMap);
                    let timer = setInterval(() => {
                        allElem[counter++].destroy();
                        if (counter === len){
                            if(listener) listener();
                            clearInterval(timer);
                        }
                    }, 100);
                }, 100);
                return this
            }
            addElements(...elements) {
                let counter = 0;
                let timer = setInterval(() => {
                    this.add(elements[counter++]);
                    if (counter === elements.length) clearInterval(timer);
                }, 100);

                return this
            }

            /**
             * 
             * @param {keyof WindowEventMap} eventType 
             * @param  {(e : Event)=> void} listener 
             * @param { string} eventName 
             * @param {*} options 
             */
            addEvent(eventType, listener, eventName, options) {

                const element = this;
                if (typeof listener === "function") {

                    const copyListener = listener;

                    function callback(target) {
                        // the target.currentElement represents the leistrap object 
                        // associated to the html target
                        copyListener.call(element, target);
                        // call any hooks here to fire and catch all events passed to
                        // an element ......
                    }

                    // verify iff the eventType already exists in the eventMap object
                    if (!this.eventMap[eventType]) { this.eventMap[eventType] = {}; }

                    // set a id to listener if the eventName is not set we generate an auto id
                    // and save it into the eventMap[eventType] object 
                    if (!eventName) eventName = !isEmpty(listener.name) ? listener.name : generateId(3, 8);

                    // the event listener id must be unique, let verify the eventName 
                    if (has(eventName, this.eventMap[eventType]))
                        DisplayError("UniqueType", "uniqueTypeError", "listenerName," + eventName);

                    // now let save the listener in to the eventMap[eventType] object
                    // this will helps to automatically remove a given eventType lister 
                    this.eventMap[eventType][eventName] = callback;

                    // finally, add an eventListener to the element
                    this._conf.addEventListener(eventType, callback, options);


                }
                return this
            }

            removeEvent(eventType, eventName, options) {
                if (!isEmpty(eventType) && !isEmpty(eventName) && this.eventMap[eventType]) {
                    if (this.eventMap[eventType][eventName]) {
                        this._conf.removeEventListener(eventType,
                            this.eventMap[eventType][eventName], options
                        );
                        delete this.eventMap[eventType][eventName];
                    }
                }
                return this
            }

            setStyleSheet(cssDefinition) {
                if (isString(cssDefinition)) this._conf.style = cssDefinition;
                if (isObject(cssDefinition)) loopObject(cssDefinition, (value, key) => {
                    this._conf.style[key] = value;
                });
                return this
            }

            setText(value) { this._conf.innerText = value; return this }
            getText() { return this._conf.textContent || this._conf.innerText }
            setClassName(classNames) {
                accessClassList(classNames, this._conf, "add");
                return this
            }
            removeClassName(classNames) {
                accessClassList(classNames, this._conf, "remove");
                return this
            }
            toggleClassName(classNames) {
                accessClassList(classNames, this._conf, "toggle");
                return this
            }
            replaceClassName(classNames, newClassNames) {
                accessClassList(classNames, this._conf, "replace", newClassNames);
                return this
            }
            addAttr(attrName, value) {
                if (isString(attrName) && isString(value)) {
                    this._conf.setAttribute(attrName, value);
                }
                else if (isObject(attrName)) {
                    loopObject(attrName, (value, key) => this._conf.setAttribute(key, value));
                }
                return this
            }

            getAttr(attrName) {
                if (isString(attrName)) return this._conf.getAttribute(attrName)

                if (isArray(attrName)) {
                    const result = {};
                    attrName.forEach(item => result[item] = this._conf.getAttribute(item));
                    return result
                }
                return null
            }

            removeAttr(attrName) {
                if (isString(attrName)) this._conf.removeAttribute(attrName);
                if (isArray(attrName)) {
                    attrName.forEach(item => this._conf.removeAttribute(item));
                }
                return this
            }
            hide() { this.addAttr('hidden', "true"); return this }
            show() { this.removeAttr('hidden'); }
        }

        // this function creates an htmlElement and you can  
        // pass some properties by the option parameter
        function create(TagName, options = {}) {
            const element = new BaseElement(document.createElement(TagName));
            SetOptions(element, options, getObjectByIndexName);
            hooks.callHook("useOption", DisplayError, element, options);
            leisElementMap[element.key] = element;
            setTimeout(() => options = null, 4000);
            return element

        }

        // the main parent!
        const main = new BaseElement(document.createElement("div"));
        main.data.id = "main";

        const win = new BaseElement(document.createElement("div"));
        win._conf = window;

        // set the default style
        document.head.append(
            new BaseElement(document.createElement("style")).setText(leistrapCss).render()
        );

        // executes and create our app once the DOM is loaded
        function whenReady(listener) {
            if (isFunction(listener)) {
                listener.call(main);
            }
            else { DisplayError("LeisError", "listenerError", listener); }

            state = true;
        }

        // indicate the HtmlElement's entry point of the application
        // defines where all elements will be added
        async function render(id) {
            setTimeout(function () {
                if (state) Render(document.getElementById(id), main);
                else { DisplayError("LeisProcessNotReady", "processNotReady"); }
            }, 500);
        }

        /**
         *  this function allows the definition of the extension 
         * note : the extension name must be unique otherwise an error will be thrown
         * the functionalities (hooks) tat an extension can access :
         *  1. setting : access all settings passed 
         *  2. leistrap : access the leistrap object
         *  3. hooks : access and add the new functionality which will added into the 
         *      the hook chosen
         */

        function defineExtension(extensionName, listener) {
            if (isFunction(listener)) {
                executeExtension(extensionName, listener);
            }
            else { DisplayError("LeisError", "listenerError", listener); }

        }
        function executeExtension(extensionName, listener) {
            if (!has(extensionName, extensionMap)) {
                const extensionResult = listener(setting, leistrap, hooks);
                if (extensionResult) leistrap[extensionName] = extensionResult;
                extensionMap[extensionName] = extensionName;
            }
            else { DisplayError("UniqueType", "uniqueTypeError", "extensionName," + extensionName); }
        }

        // allows to get the object indexed via the data.id property
        function getObjectByIndexName(indexName, waitFor, clb) {
            if (isString(indexName) && waitFor) {
                indexedElementEvent.invoke(indexName, clb);
            }
            return indexName
        }

        // adds an element to other by using localId syntax
        function addTo(parentId, child) {
            if (isString(parentId)) {
                getObjectByIndexName(parentId, true, function (parentElement) {
                    parentElement.add(child);
                });
            }
        }

        // find a leistrap object and apply some methods to it
        function getElement(name, method, ...args) {
            return new Promise(function (resolve, reject) {
                getObjectByIndexName(name, true, element => {
                    if (typeof element[method] == "function")
                        element[method](...args);
                    resolve(element);
                });
            })
        }

        function accessClassList(classNames, element, method, tokes) {
            if (tokes && method == "replace") {
                tokes = tokes.trim().split(String.fromCharCode(32));
                classNames.trim().split(String.fromCharCode(32))
                    .forEach((item, index) => {
                        if (!isEmpty(item) && tokes[index])
                            element.classList.replace(item, tokes[index]);
                    });
            }
            else {
                if (isString(classNames)) classNames.trim().split(String.fromCharCode(32))
                    .forEach((item, index) => { if (!isEmpty(item)) element.classList[method](item); });
            }
            return this
        }

        function addCss(cssDeclaration, force) {
            if (cssDeclaration || force) {
                const style = create("style", { text: cssDeclaration });
                document.head.append(style.render());
                return style
            }
            return null
        }
        function leistrap(configurations = copyObject(setting)) {
            setting = configurations;
        }

        function handleAllEvent(eventName, evObject, element, timeout, ...argv) {
            if (has(eventName, evObject)) {
                evObject[eventName].forEach(item => {
                    if (timeout) setTimeout(item, timeout, element, ...argv);
                    else { item(element, ...argv); }
                });
            }
        }

        leistrap.main = main;
        leistrap.win = win;
        leistrap.event = mainEvent;
        leistrap.create = create;
        leistrap.whenReady = whenReady;
        leistrap.render = render;
        leistrap.defineExtension = defineExtension;
        leistrap.event.handle("main", (e) => e.send(main));
        leistrap.addTo = addTo;
        leistrap.get = getElement;
        leistrap.addCss = addCss;
        leistrap.hideWhenWinClick = function (element) { hideWin.push(element); };
        leistrap.lorem = "    Lorem, ipsum dolor sit amet consectetur adipisicing elit. Culpa dolor aliquid quibusdam. Optio mollitia fugit nulla culpa, provident placeat unde iure eveniet earum nam, laborum hic autem? Rem, tenetur odio!";
        leistrap.Colors = ["primary", "secondary", "info", "dark", "danger", "light", "success", "warning"];
        leistrap.MLorem = function (num) { return rangeList(num).map(function (item) { return leistrap.lorem }).join(' ') };
        // init all default extensions, functionalities

        // hide all elements inside the hideWin Array

        window.addEventListener('click', function (event) {
            hideWin.forEach(item => item(event));
        });
        leistrap.map = leisElementMap;
      
        return leistrap
    })();

    var rootCss = ".leistrapUI-root{\r\n    position: relative;\r\n    --header-h : 60px;\r\n    --header-w : 100%;\r\n    --card-bg : #fff;\r\n    --side-fun-w : 80px;\r\n    \r\n}\r\n\r\nbody{\r\n    width: 100%;\r\n    height: 100vh;\r\n    overflow: hidden;\r\n}\r\n\r\n.leistrapUI-root .header{\r\n    position: fixed;\r\n    top: -10px;\r\n    background-color: var(--card-bg);\r\n    width: var(--header-w);\r\n    height:  calc(var(--header-h) + 10px);\r\n    border-bottom: 1px solid #ddd;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n\r\n}\r\n\r\n.leistrapUI-root .sideFun{\r\n    padding: 10px;\r\n    position: fixed;\r\n    left: 0;\r\n    top: var(--header-h);\r\n    width: var(--side-fun-w);\r\n    height: calc(100vh - var(--header-h));\r\n    background-color: var(--card-bg);\r\n    border-right: 1px solid #ddd;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n}\r\n\r\n.leistrapUI-root .contentContainer{\r\n    position: relative;\r\n    margin-top: calc(var(--header-h) - 23px );\r\n    margin-left: var(--side-fun-w);\r\n    width: calc(100% - var(--side-fun-w));\r\n    height: calc(100vh - var(--header-h)  - 8px); \r\n \r\n  \r\n}\r\n\r\n.leistrapUI-root .contentContainer .side{\r\n    width: 20%;\r\n    height: 100%;\r\n    background-color: var(--card-bg);\r\n    border-right: 1px solid #ddd;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n    overflow: hidden;\r\n    overflow-y: auto;\r\n    padding: 20px;\r\n}\r\n\r\n.leistrapUI-root .contentContainer  .propSide{\r\n    width: 20%;\r\n    height: 100%;\r\n    background-color: var(--card-bg);\r\n    border-left: 1px solid #ddd;\r\n    padding: 4px 8px;\r\n    overflow: hidden;\r\n    overflow-y: auto;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n}\r\n\r\n\r\n.leistrapUI-root .contentContainer .content{\r\n    position: relative;\r\n    width: 60%;\r\n    height:  100%;\r\n}\r\n\r\n.leistrapUI-root .contentContainer .content .workSpace{\r\n    position: relative;\r\n    width: 100%;\r\n    border: 0;\r\n    outline: 0;\r\n    height: calc(100vh - var(--header-h)  - 20px); \r\n}\r\n\r\n .hover{\r\n    outline: 2px solid green !important;\r\n    background-color: red;\r\n}\r\n\r\n.tb-b{\r\n    gap: 0 !important;\r\n}\r\n.tb-b *{\r\n    display: block;\r\n    background-color: transparent;\r\n    outline: none;\r\n    border: none;\r\n    cursor: pointer;\r\n    padding: 5px 7px;\r\n    margin: 0 !important;\r\n    border-radius: 5px;\r\n}\r\n\r\n.tb-b button:hover,\r\n.tb-b *.active{\r\n    background-color: var(--leis-select-cl) !important;\r\n}";

    function shortCut$1(element, objLeis) {
        
        // create event emitter to handle a given combination of 
        // key or characters
        const event_ = _EventEmitter();

        //object to save all keydown keyCode
        let shortcuts = {};

        // the counter variable is for sorting the keys save into the shortcuts object
        //in order asc
        let counter = 0;
        
        // listening to key key and get this one
        element.addEventListener("keydown", function (e) {
            // checkKey(e)
        
            if (!has(e.key.toLowerCase(), shortcuts)) {
                shortcuts[e.key.toLowerCase()] = counter++;      
            }
            getResult(e);
        });

        function getResult(e){
            const invers = inverseObject(shortcuts);
            let result = Object.keys(invers);
            let len = result.length;
            result = result.sort().map(item => invers[item]).join("");
      
            
            if (has(result, event_.eventsList()) && len <= 3 ) {
                  e.preventDefault();
                event_.invoke(result, null, e);

            }
        }



        //remove the key released
        element.addEventListener("keyup", function (e) {
            // e.preventDefault()

            // if the shortcut has 4 or more characters
            //call the shortcut handle
            if(Object.keys(shortcuts).length >= 4 ) getResult(e);
          
            delete shortcuts[e.key.toLowerCase()];
            if (isEmpty(shortcuts)) {
                counter = 0;
            }
        });

        // empty the shortcuts object 
        element.addEventListener("blur", function (e) {
           shortcuts = {};
        });

        
         function bind (token, listener) {
            const tokenTyped = keyMap$1(token);
            event_.handle(tokenTyped.result, (evt, evtKey) => {
                listener(evtKey);
            });
        }
        function  reShortcut (token) {
            const short = keyMap$1(token).result;
            event_.removeEvent(short);
        }

        element.bind = bind;
        element.reShortcut = reShortcut;
    }




    function keyMap$1(keys) {
        let keyTyped = keys.replace(/ /gi, "").split("+")
            .map(item => {
                if (isEmpty(item)) return "+"
                else { return item }

            });
        const maps = {
            "tab": "tab",
            "ctrl": "control",
            "control": "control",
            "cmd": "command",
            "escape": "escape",
            "esc": "escape",
            "capslock": "capslock",
            "shift": "shift",
            "alt": "alt",
            "enter": "enter",
            "contextmenu": "contextmenu",
            "backspace": " ",
            "arrowup": "arrowup",
            "arrowdown": "arrowdown",
            "arrowleft": "arrowleft",
            "arrowright": "arrowright"
        };

        keyTyped = keyTyped.map(item => {
            item = item.toLowerCase();
            if (maps[item]) return maps[item]
            else { return item }

        });

        return {
            result: keyTyped.join("").replace("++", '+'),
            length: keyTyped.length
        }

    }

    var tabCSS = "/* tabs */\r\n\r\n.leis-tabs-card {\r\n    position: relative;\r\n    -webkit-display: flex;\r\n    -moz-display: flex;\r\n    -o-display: flex;\r\n    -ms-display: flex;\r\n    display: flex;\r\n    gap: 0.5em;\r\n    white-space: nowrap;\r\n    overflow-x:  auto;\r\n    background-color: inherit;\r\n    font-size: inherit;\r\n}\r\n\r\n.leis-tabs-btn {\r\n    position: relative;\r\n    display: -moz-box;\r\n    display: -webkit-box;\r\n    display: block;\r\n    background-color: inherit;\r\n    outline: none;\r\n    border: none;\r\n    font-weight: 500;\r\n    cursor: pointer;\r\n    text-decoration: none;\r\n    list-style: none;\r\n    overflow: visible;\r\n    text-overflow: inherit;\r\n}\r\n\r\n\r\n.leis-tab-txt {\r\n    padding: 0.5rem;\r\n}\r\n\r\n.leis-tab-content {\r\n    position: relative;\r\n    display: -webkit-box;\r\n    display: -ms-flexbox;\r\n    display: flex;\r\n    display: none;\r\n    -webkit-box-orient: vertical;\r\n    -webkit-box-direction: normal;\r\n    -ms-flex-direction: column;\r\n    flex-direction: column;\r\n    min-width: 0;\r\n    word-wrap: break-word;\r\n    background-color: inherit;\r\n    animation: fade-content 1s ease-in-out;\r\n}\r\n\r\n.leis-tab-content.active {\r\n    display: block;\r\n    background-color: inherit;\r\n    font-size: inherit;\r\n    font-weight: inherit;\r\n}\r\n\r\n.leis-tabs-btn.active {\r\n    background-color: #ddd;\r\n}\r\n\r\n@keyframes fade-content {\r\n    from {\r\n        opacity: 0;\r\n    }\r\n\r\n    to {\r\n        opacity: 1;\r\n    }\r\n}\r\n";

    /**
     * 
     * @param {{
     * btnParent : leistrap.Leistrap<HTMLElement>,
     * contentParent : leistrap.Leistrap<HTMLElement> 
     * }} option 
     */

    function leisTab(option) {

        let event = _EventEmitter();
        // the default tabButton tag
        let TAG_NAME = "button";

        if (!option) option = {};
        leistrap.addCss(tabCSS);

        // contains all tabs
        let tabMap = {};

        const buttonsContainer = leistrap.create("div",
            {
                className: "leis-tabs-card",
                parent: option.btnParent
            });

        const contentContainer = leistrap.create('div',
            {
                parent: option.contentParent,
                className: "leis-mainContentTab"
            });

        /**
         * crate the tab button  and its content
         * @param {string} btnName  the tabButton name , this must be unique
         * @param {leistrap.Leistrap<HTMLElement>} content  tab content to show 
         * once the button is clicked
         * @param {{
         * createButton?:boolean,
         * buttonText ; string
         * }} options 
         * @returns {leistrap.Leistrap<HTMLButtonElement> | null}
         */
        function define(btnName, content, options) {
            let result = null;
            let btn = null;
            if (!options) options = {};

            if (!has(btnName, tabMap)) {
                content.setClassName("leis-tab-content");
                if (options.createButton) {
                    btn = generateId(3, 7);
                    result = createButton(btnName, options, btn);
                }
                tabMap[btnName] = { content, btn };
                contentContainer.add(content);
            }
            else { DisplayError('UniqueType', "uniqueTypeError", "tabName," + btnName); }
            return result
        }

        function createButton(btnName, option, id) {
            return leistrap.create(TAG_NAME,
                {
                    text: option.buttonText || "leisButton",
                    onclick: () => invoke(btnName),
                    parent: buttonsContainer,
                    data: { id },
                    type: "button"
                }
            )
        }


        /**
         * call and show tab by its btnName
         * @param {string} btnName 
         */
        function invoke(btnName) {
            if (has(btnName, tabMap)) {
                loopObject(tabMap).forEach(item => {
                    item.content.hide();
                    item.content.removeClassName("active");
                    if (item.btn) {
                        leistrap.get(item.btn, "removeClassName", "active");
                    }
                });

                const current = tabMap[btnName];
                current.content.show();
                current.content.setClassName("active");
                event.invoke(btnName);
                if (current.btn) {
                    leistrap.get(current.btn, "setClassName", "active");
                }
            }
        }
        /**
         * 
         * @param {keyof HTMLElementTagNameMap} tagName_ 
         * @returns void
         */
        const useElement = tagName_ => TAG_NAME = tagName_;
        /**
         * removes a particular tab to the component
         * @param {string} TabName 
         */
        function remove(TabName) {
            if (has(TabName, tabMap)) {

                // destroy the tab content
                tabMap[TabName].content.destroy();
                if (tabMap[TabName]) {
                    leistrap.get(tabMap[TabName].btn, "destroy")
                        .then(elem => delete tabMap[TabName]);
                }
                else { delete tabMap[tabName]; }
            }
        }
        /** destroy the tab component */
        function destroy() {
            // clear the tabMap object
            loopObject(tabMap, (value, key) => delete tabMap[key]);
            // clear the TAB object 
            loopObject(TAB, (value, key) => delete TAB[key]);
            buttonsContainer.destroy();
            contentContainer.destroy();
            event.clear();
            TAG_NAME = null;
        }

        const TAB = {
            buttonsContainer,
            contentContainer,
            define,
            invoke,
            useElement,
            destroy,
            remove,
            event,
        };

        return TAB
    }

    leistrap.addCss(rootCss);

    const Root = (function(){
          
        const container = leistrap.create("div", {
            className : "leistrapUI-root"
        });

        const header = leistrap.create("div", {
            className : "leis-flex leis-row header",
            parent : container,

        });

        const sideFun = leistrap.create("div", {
            parent : container,
            className: "leis-flex sideFun"
        });


        const side = leistrap.create("div", {
            className : "side leis-flex"
        });

        const content  = leistrap.create("div", {
            className : "content"
        });

        const propSide = leistrap.create("div", {
            className : "propSide"
        });

        const contentContainer = leistrap.create("div", {
            parent : container,
            content : [side, content, propSide],
            className : "contentContainer leis-flex leis-row"
        });

        const pageContainer = leistrap.create("div", {className: "page-cd"});

        const tab = leisTab({
            btnParent : sideFun,
            contentParent :side
        });
        tab.buttonsContainer.setClassName('tb-b leis-flex');
        
        tab.define("pages",  pageContainer, {
            buttonText : "Pages",
            createButton : true
        });
        let prop = {
            width : 60
        };
        
        shortCut$1(window);
        hideShow(side , "ctrl+b", window);
        hideShow(propSide , "ctrl+j", window);



        function hideShow(elem, sh, parentWindow){
            parentWindow.bind(sh, function(e){
                e.preventDefault();
                if(!elem.state.visible){ 
                    prop.width -= 20;
                    elem.setStyleSheet({display : "block"});
                    content.setStyleSheet({width : prop.width.toString()+"%"});
                    elem.state.visible=  true;
                    
                }
                else {
                    prop.width += 20;
                    elem.setStyleSheet({display : "none"});
                    content.setStyleSheet({width : prop.width.toString()+"%"});
                    elem.state.visible= false;
                    
                }
            
            });
        }
       

        // wait for the workspace creation
        let pageTab = leisTab({
            btnParent : pageContainer,
            contentParent :content
        });
        pageTab.buttonsContainer.setClassName('tb-b leis-flex');

        /**
         * 
         * @param {string} pageName 
         * @param {string} lbl 
         * @param {(page: leistrap.Leistrap<HTMLIFrameElement>)=> void} onActive 
         * @param {(page: leistrap.Leistrap<HTMLIFrameElement>)=> void} onInvoke
         */
       function createPage(pageName, lbl, onActive, onInvoke){
            let container = leistrap.create('div');

            const workSpace = leistrap.create("iframe", {
                className : "workSpace",
                parent : container,
            });

            pageTab.define(pageName, container, {
                createButton : true, 
                buttonText : lbl
            });
            pageTab.event.handle(pageName, ()=> onInvoke ? onInvoke(workSpace) : null);

            let checker = setInterval(function(){
                if(workSpace._conf.className){
                    if(onActive) onActive(workSpace);
                    workSpace._conf.contentDocument.body;
                    shortCut$1(workSpace._conf.contentDocument);
                    hideShow(side , "ctrl+b", workSpace._conf.contentDocument);
                    hideShow(propSide , "ctrl+j", workSpace._conf.contentDocument);
                    clearInterval(checker);
                }
            }, 1000);
       }
          
        const ROOT = {
            container, 
            header,
            sideFun,
            side,
            content,
            contentContainer,
            propSide,
            createPage,
            tab,
    };
        return ROOT
    })();

    const StylePropComponentEmitter = _EventEmitter();
    const StyleEmitter = _EventEmitter();

    const colorName = {
        "aliceblue": [240, 248, 255],
        "antiquewhite": [250, 235, 215],
        "aqua": [0, 255, 255],
        "aquamarine": [127, 255, 212],
        "azure": [240, 255, 255],
        "beige": [245, 245, 220],
        "bisque": [255, 228, 196],
        "black": [0, 0, 0],
        "blanchedalmond": [255, 235, 205],
        "blue": [0, 0, 255],
        "blueviolet": [138, 43, 226],
        "brown": [165, 42, 42],
        "burlywood": [222, 184, 135],
        "cadetblue": [95, 158, 160],
        "chartreuse": [127, 255, 0],
        "chocolate": [210, 105, 30],
        "coral": [255, 127, 80],
        "cornflowerblue": [100, 149, 237],
        "cornsilk": [255, 248, 220],
        "crimson": [220, 20, 60],
        "cyan": [0, 255, 255],
        "darkblue": [0, 0, 139],
        "darkcyan": [0, 139, 139],
        "darkgoldenrod": [184, 134, 11],
        "darkgray": [169, 169, 169],
        "darkgreen": [0, 100, 0],
        "darkgrey": [169, 169, 169],
        "darkkhaki": [189, 183, 107],
        "darkmagenta": [139, 0, 139],
        "darkolivegreen": [85, 107, 47],
        "darkorange": [255, 140, 0],
        "darkorchid": [153, 50, 204],
        "darkred": [139, 0, 0],
        "darksalmon": [233, 150, 122],
        "darkseagreen": [143, 188, 143],
        "darkslateblue": [72, 61, 139],
        "darkslategray": [47, 79, 79],
        "darkslategrey": [47, 79, 79],
        "darkturquoise": [0, 206, 209],
        "darkviolet": [148, 0, 211],
        "deeppink": [255, 20, 147],
        "deepskyblue": [0, 191, 255],
        "dimgray": [105, 105, 105],
        "dimgrey": [105, 105, 105],
        "dodgerblue": [30, 144, 255],
        "firebrick": [178, 34, 34],
        "floralwhite": [255, 250, 240],
        "forestgreen": [34, 139, 34],
        "fuchsia": [255, 0, 255],
        "gainsboro": [220, 220, 220],
        "ghostwhite": [248, 248, 255],
        "gold": [255, 215, 0],
        "goldenrod": [218, 165, 32],
        "gray": [128, 128, 128],
        "green": [0, 128, 0],
        "greenyellow": [173, 255, 47],
        "grey": [128, 128, 128],
        "honeydew": [240, 255, 240],
        "hotpink": [255, 105, 180],
        "indianred": [205, 92, 92],
        "indigo": [75, 0, 130],
        "ivory": [255, 255, 240],
        "khaki": [240, 230, 140],
        "lavender": [230, 230, 250],
        "lavenderblush": [255, 240, 245],
        "lawngreen": [124, 252, 0],
        "lemonchiffon": [255, 250, 205],
        "lightblue": [173, 216, 230],
        "lightcoral": [240, 128, 128],
        "lightcyan": [224, 255, 255],
        "lightgoldenrodyellow": [250, 250, 210],
        "lightgray": [211, 211, 211],
        "lightgreen": [144, 238, 144],
        "lightgrey": [211, 211, 211],
        "lightpink": [255, 182, 193],
        "lightsalmon": [255, 160, 122],
        "lightseagreen": [32, 178, 170],
        "lightskyblue": [135, 206, 250],
        "lightslategray": [119, 136, 153],
        "lightslategrey": [119, 136, 153],
        "lightsteelblue": [176, 196, 222],
        "lightyellow": [255, 255, 224],
        "lime": [0, 255, 0],
        "limegreen": [50, 205, 50],
        "linen": [250, 240, 230],
        "magenta": [255, 0, 255],
        "maroon": [128, 0, 0],
        "mediumaquamarine": [102, 205, 170],
        "mediumblue": [0, 0, 205],
        "mediumorchid": [186, 85, 211],
        "mediumpurple": [147, 112, 219],
        "mediumseagreen": [60, 179, 113],
        "mediumslateblue": [123, 104, 238],
        "mediumspringgreen": [0, 250, 154],
        "mediumturquoise": [72, 209, 204],
        "mediumvioletred": [199, 21, 133],
        "midnightblue": [25, 25, 112],
        "mintcream": [245, 255, 250],
        "mistyrose": [255, 228, 225],
        "moccasin": [255, 228, 181],
        "navajowhite": [255, 222, 173],
        "navy": [0, 0, 128],
        "oldlace": [253, 245, 230],
        "olive": [128, 128, 0],
        "olivedrab": [107, 142, 35],
        "orange": [255, 165, 0],
        "orangered": [255, 69, 0],
        "orchid": [218, 112, 214],
        "palegoldenrod": [238, 232, 170],
        "palegreen": [152, 251, 152],
        "paleturquoise": [175, 238, 238],
        "palevioletred": [219, 112, 147],
        "papayawhip": [255, 239, 213],
        "peachpuff": [255, 218, 185],
        "peru": [205, 133, 63],
        "pink": [255, 192, 203],
        "plum": [221, 160, 221],
        "powderblue": [176, 224, 230],
        "purple": [128, 0, 128],
        "rebeccapurple": [102, 51, 153],
        "red": [255, 0, 0],
        "rosybrown": [188, 143, 143],
        "royalblue": [65, 105, 225],
        "saddlebrown": [139, 69, 19],
        "salmon": [250, 128, 114],
        "sandybrown": [244, 164, 96],
        "seagreen": [46, 139, 87],
        "seashell": [255, 245, 238],
        "sienna": [160, 82, 45],
        "silver": [192, 192, 192],
        "skyblue": [135, 206, 235],
        "slateblue": [106, 90, 205],
        "slategray": [112, 128, 144],
        "slategrey": [112, 128, 144],
        "snow": [255, 250, 250],
        "springgreen": [0, 255, 127],
        "steelblue": [70, 130, 180],
        "tan": [210, 180, 140],
        "teal": [0, 128, 128],
        "thistle": [216, 191, 216],
        "tomato": [255, 99, 71],
        "turquoise": [64, 224, 208],
        "violet": [238, 130, 238],
        "wheat": [245, 222, 179],
        "white": [255, 255, 255],
        "whitesmoke": [245, 245, 245],
        "yellow": [255, 255, 0],
        "yellowgreen": [154, 205, 50]
    };

    function shortCut(element, objLeis) {
        
        // create event emitter to handle a given combination of 
        // key or characters
        const event_ = _EventEmitter();

        //object to save all keydown keyCode
        let shortcuts = {};

        // the counter variable is for sorting the keys save into the shortcuts object
        //in order asc
        let counter = 0;
        
        // listening to key key and get this one
        element.addEventListener("keydown", function (e) {
            // checkKey(e)
        
            if (!has(e.key.toLowerCase(), shortcuts)) {
                shortcuts[e.key.toLowerCase()] = counter++;      
            }
            getResult(e);
        });

        function getResult(e){
            const invers = inverseObject(shortcuts);
            let result = Object.keys(invers);
            let len = result.length;
            result = result.sort().map(item => invers[item]).join("");
      
            
            if (has(result, event_.eventsList()) && len <= 3 ) {
                  e.preventDefault();
                event_.invoke(result, null, e);

            }
        }



        //remove the key released
        element.addEventListener("keyup", function (e) {
            // e.preventDefault()

            // if the shortcut has 4 or more characters
            //call the shortcut handle
            if(Object.keys(shortcuts).length >= 4 ) getResult(e);
          
            delete shortcuts[e.key.toLowerCase()];
            if (isEmpty(shortcuts)) {
                counter = 0;
            }
        });

        // empty the shortcuts object 
        element.addEventListener("blur", function (e) {
           shortcuts = {};
        });

        
         function bind (token, listener) {
            const tokenTyped = keyMap(token);
            event_.handle(tokenTyped.result, (evt, evtKey) => {
                listener(evtKey);
            });
        }
        function  reShortcut (token) {
            const short = keyMap(token).result;
            event_.removeEvent(short);
        }

        element.bind = bind;
        element.reShortcut = reShortcut;
    }




    function keyMap(keys) {
        let keyTyped = keys.replace(/ /gi, "").split("+")
            .map(item => {
                if (isEmpty(item)) return "+"
                else { return item }

            });
        const maps = {
            "tab": "tab",
            "ctrl": "control",
            "control": "control",
            "cmd": "command",
            "escape": "escape",
            "esc": "escape",
            "capslock": "capslock",
            "shift": "shift",
            "alt": "alt",
            "enter": "enter",
            "contextmenu": "contextmenu",
            "backspace": " ",
            "arrowup": "arrowup",
            "arrowdown": "arrowdown",
            "arrowleft": "arrowleft",
            "arrowright": "arrowright"
        };

        keyTyped = keyTyped.map(item => {
            item = item.toLowerCase();
            if (maps[item]) return maps[item]
            else { return item }

        });

        return {
            result: keyTyped.join("").replace("++", '+'),
            length: keyTyped.length
        }

    }

    var popCss = ".leis-pop{\r\n    position: fixed;\r\n    left: 25%;\r\n    top: 10px;\r\n    width: 500px;\r\n    height: 400px;\r\n    background-color: #fff;\r\n    border: var(--border);\r\n    border-radius: 8px;\r\n    padding: 20px;\r\n    overflow: hidden;\r\n    overflow-y: auto;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n\r\n}\r\n\r\n.pop-title{\r\n    font-weight: 500;\r\n    padding-bottom: 0.5rem;\r\n    border-bottom: var(--leis-border);\r\n    margin-bottom: 1rem;\r\n    justify-content: space-between;\r\n}\r\n\r\n.pop-body{\r\n\r\n    position: relative;\r\n    width: 100%;\r\n    height: calc(100% - 5rem);\r\n    overflow:hidden ;\r\n    overflow-y: auto;\r\n}\r\n\r\n.pop-title+.pop-header{\r\n    top: -0.5rem;\r\n    margin-bottom: 0.2rem;\r\n}\r\n\r\n.zoom-out{\r\n    animation: zoom-out .3s ease-in-out;\r\n}\r\n\r\n\r\n@keyframes zoom-out {\r\n    from {\r\n        opacity: 0.1;\r\n        transform: scale(0.2);\r\n\r\n    }\r\n\r\n    top {\r\n        opacity: 1;\r\n        transform: scale(0);\r\n    }\r\n}";

    /**
     * 
     * @param {'absolute'} position 
     * @param {{
     * container: HTMLElement,
     * popUp : HTMLElement,
     * side  : Array<"top"|"bottom"|'left'|'right'>,
     * rect? : {x: number, y : number, top: number, left : number, width: number, height : number} 
     * popUpRect? : {x: number, y : number, top: number, left : number, width: number, height : number} 
     * }} option 
     */
    function setPopPosition(position, option) {

        // check if the  popup dialog is visible or not
        let show = false;

        if (!option) option = {};
        if (!option.side) option.side = ["top", 'bottom'];
        absolutePosition(option.container, option.popUp, option.rect, option.popUpRect);


        /**
         * @param {HTMLElement} container 
         * @param {HTMLElement} popUp 
         */
        function absolutePosition(container, popUp, defRct, popUpRect) {
            show = false;
            // check left side
            const rect = defRct || container.getClientRects()[0];
            const popRect = popUpRect || popUp.getClientRects()[0];
            const gap = option.gap || 10;
            const SIDE = { TOP, BOTTOM, LEFT, RIGHT };

            if (option.side) {
                option.side.forEach(item => {
                    if (SIDE[item.toUpperCase()] && !show) {
                        SIDE[item.toUpperCase()]();
                    }

                });

            }
            function LEFT() {
                // left side
                if (rect.left + gap >= popRect.width) {
                    if (rect.top + gap >= popRect.height) {
                        popUp.style.left = (rect.left - popRect.width).toString() + "px";
                        popUp.style.top = ((rect.top - popRect.height) + rect.height).toString() + "px";
                        show = true;
                    }
                    else if (window.innerHeight - (rect.top + gap + rect.height) >= popRect.height) {
                        popUp.style.left = (rect.left - popRect.width).toString() + "px";
                        popUp.style.top = (rect.top).toString() + "px";
                        show = true;
                    }

                }
            }

            function BOTTOM() {
                // bottom side

                if (window.innerHeight - (rect.top + rect.height + gap) >= popRect.height) {
                    //bottom right
                    if (window.innerWidth - (rect.x + gap) >= popRect.width) {
                        popUp.style.top = (rect.top + rect.height).toString() + "px";
                        popUp.style.left = (rect.x).toString() + "px";
                        show = true;
                    }
                    else {
                        popUp.style.top = (rect.top + rect.height).toString() + "px";
                        let left = ((rect.x + rect.width) - popRect.width);
                        if (left <= 0) left = gap;
                        popUp.style.left = left.toString() + "px";
                        show = true;
                    }

                }
            }

            function TOP() {
                // top side

                if (rect.top + gap >= popRect.height) {
                    //top right

                    if (window.innerWidth - (rect.x + gap) >= popRect.width) {
                        popUp.style.top = (rect.top - popRect.height).toString() + "px";
                        popUp.style.left = (rect.x).toString() + "px";
                        show = true;
                    }
                    else {
                        popUp.style.top = (rect.top - popRect.height).toString() + "px";
                        let left = ((rect.x + rect.width) - popRect.width);
                        if (left <= 0) left = gap;
                        popUp.style.left = left.toString() + "px";
                        show = true;

                    }

                }
            }


            function RIGHT() {
                // right side

                if (window.innerWidth - (rect.x + rect.width) >= popRect.width) {

                    // right top
                    if (rect.top + gap >= popRect.height) {
                        popUp.style.top = ((rect.top + rect.height) - popRect.height).toString() + "px";
                        popUp.style.left = (rect.x + rect.width).toString() + "px";
                        show = true;
                    }
                    else {
                        let top = (rect.top + rect.height) - gap;
                        if ((top + popRect.height) > window.innerHeight) {
                            let cp = top - ((top + popRect.height + gap) - window.innerHeight);
                            top = cp;
                        }
                        popUp.style.top = top.toString() + "px";
                        popUp.style.left = ((rect.x + rect.width) - gap).toString() + "px";
                        show = true;
                    }

                }

            }
        }

        // when there s no place to play the pop up  let set a default style value
        if (!show) {
            option.popUp.style.top = "10px";
            option.popUp.style.left = "10px";
        }
    }

    /**
     * drag event
     * @param {HTMLElement} element
     * @type {{
     * dx: number,
     * dy:number,
     * startY: number,
     * startX : number,
     * target : HTMLElement
     * }} draggableEvent
     * 
     * @param {{
     * end? : (option : draggableEvent)=> void,
     * move? : (option : draggableEvent)=> void,
     * start? : (option : draggableEvent)=> void,
     * autoDragging? : Boolean,
     * targetBind : HTMLElement,
     * preventDefault : Boolean
     * }} option
     */

    function Draggable(element, option = {}) {

        // Variables to store initial positions
        let startX, startY, initialMouseX, initialMouseY, startWidth, startHeight;
        let targetBind;
        let dx, dy;

        let start, counter;

        // Step 2: Add 'mousedown' event listener to start dragging
        element.addEventListener('mousedown', function (e) {
            if (option.init) option.init(e);
            if (option.preventDefault) e.preventDefault();
            // check the start event
            counter = 1;
            // Record initial mouse position
            initialMouseX = e.clientX;
            initialMouseY = e.clientY;

            // Capture the element's initial position
            startX = element.offsetLeft;
            startY = element.offsetTop;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
            if (option.targetBind) {
                targetBind = {
                    width: option.targetBind.offsetWidth,
                    height: option.targetBind.offsetHeight,
                    x: option.targetBind.offsetLeft,
                    y: option.targetBind.offsetTop
                };
            }

            // Step 3: Add event listeners for mousemove and mouseup
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Step 4: Define function to handle 'mousemove'
        function onMouseMove(e) {
            if (option.preventDefault) e.preventDefault();
            // Calculate how far the mouse has moved 
            dx = e.clientX - initialMouseX;
            dy = e.clientY - initialMouseY;

            //check the starting drag event
            if (counter) counter++;
            if (counter === 3) {
                counter = null;
                if (option.start) option.start({ target: element, dx, dy, startX, startY });
                start = true;
            }

            if (option.move) option.move({
                target: element,
                dx, dy, startX, startY, startHeight, startWidth,
                initialMouseX, initialMouseY, event: e, targetBind
            });
            if (option.autoDragging && !element.resizable) {
                // Update the element's position
                element.style.left = startX + dx + 'px';
                element.style.top = startY + dy + 'px';
            }
        }

        // Step 5: Define function to stop dragging
        function onMouseUp() {
            // Remove 'mousemove' event when mouse button is released
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (start && option.end) {
                option.end({ target: element, dx, dy, startX, startY });
                start = false;
                counter = null;
            }

            element.resizable = false;

        }

    }

    const DROP_MAP = {};
    let ZIndex = 1;
    leistrap.addCss(popCss);

    /**
     * @param {leistrap.Leistrap<HTMLElement>} button the button once clicked show the popup
     * @param {Array<"left" | "right" |"top" |"bottom">} side 
     * @param {boolean} [drag=true] 
     */
    function DropUp(button, side, drag=true, parent) {

        // all eventListeners
        const eventMap = {};
        
        // h custom property
        let action; 
        
        const pop = leistrap.create("div", {
            parent: parent == "sb-m" ? null : "main",
            className: "leis-dropdown-content leis-pop",
            onclick: (e) => {
                e.stopPropagation();
                if (eventMap.click) eventMap.click.forEach(item => item());
            }
        });
        pop.state.visible = false;

        setBtn(button);

        if(drag){
            Draggable(pop._conf, {
                autoDragging : true
            });
        }

        /** 
         * associate a button to the popup container */
        function setBtn(btn) {
            if (btn) {
                btn.addEvent("click", function (e) {
                    tryCode(()=>{
                        if (e) e.stopPropagation();
                            show(btn.popInstance);
                            setPopPosition("absolute", {
                                container: this._conf,
                                popUp: pop._conf,
                                side: side || ["bottom", "top", "right", "left"]
                            });
                            pop.setClassName("zoom-out");
                    });
                });
            }
        }

        /**
         * 
         * @param {{x: number, 
         * y : number,
         *  top: number, 
         * left : number, 
         * width: number, 
         * height : number} } rect the position for moving the popUp
         */
        function move(rect, side) {
            show();
            setPopPosition("absolute", {
                rect,
                popUp: pop._conf,
                side: side || ["bottom", "top", "right", "left"]
            });
        }

        /**
         * @param {"hide" | "show" |"click"} eventName 
         * @param {()=> void} listener 
         */
        function once(eventName, listener) {
            if (!has(eventName, eventMap)) eventMap[eventName] = [];
            eventMap[eventName].push(listener);
        }


        /**
         * show the component
         * @param {Boolean} newInstance 
         */
        function show(newInstance) {
            if (!pop.state.visible || newInstance) {
                pop.setClassName("show");
                pop.setStyleSheet({ zIndex: ZIndex++ });
                if (eventMap.show) eventMap.show.forEach(item => item());
                pop.state.visible = true;
            }
        }

        /**
         * hide the component
         */
        function hide() {
            if (pop.state.visible) {
                pop.removeClassName("show");
                if (eventMap.hide) eventMap.hide.forEach(item => item());
                pop.state.visible = false;
            }

            pop.removeClassName("zoom-out");
        }

        const POP_UP = {
            pop,
            move,
            setBtn,
            show,
            hide,
            once,

            /**
             * this  property listen to the changes and it's overwrite
             * @type {(arg)=> void} 
             */
            action,
            children : []
        };

        // push the dropUp object to the DROP_MAP 
        DROP_MAP[pop.key] = POP_UP;

        return POP_UP
    }



    // hide all popup whn window is clicked
    leistrap.hideWhenWinClick(HIDE);
    shortCut(window);
    window.bind("esc", HIDE);

    leistrap.event.handle("hidepopup", function(e, ...exc){
        if(!exc) exc = [];
        loopObject(copyObject(DROP_MAP, false, false)).forEach(pop => {
            if(!has(pop.pop.key, exc))   pop.hide();
          
        });
        
    });

    function HIDE (e) {
        const exc = e.target.exc || [];

        if(!(e.target.id === "leis-color"))
        
        loopObject(copyObject(DROP_MAP, false, false, ...exc)).forEach(pop => {
            pop.hide();
        });
    }

    var colorCss = ".color-btn{\r\n    border:  none;\r\n    outline: none;\r\n    width:  30px;\r\n    height: 30px;\r\n    border-radius: 50%;\r\n    cursor: pointer;\r\n    -webkit-user-select: none;\r\n    user-select: none;\r\n    border: 1.5px solid green;\r\n\r\n}\r\n\r\n.color-btn:focus{\r\n    -webkit-shadow: 0 0 5px var(--leis-baseColor);\r\n    box-shadow: 0 0 5px var(--leis-baseColor);\r\n}\r\n.color-btn-cd{\r\n    gap: 10px;\r\n}\r\n.col-6{\r\n    position: relative;\r\n    width: 100%;\r\n}\r\n.colorView{\r\n    position: relative;\r\n    width: 100%;\r\n    height: 70px;\r\n    border-radius: inherit;\r\n   border: var(--leis-border);\r\n}\r\n\r\n.colorValueView{\r\n    font-size: 10x;\r\n    font-weight: 300;\r\n    white-space: nowrap;\r\n    text-align: center;\r\n    overflow: hidden;\r\n    \r\n}";

    var COLORIS = "/*!\r\n * Copyright (c) 2021 Momo Bassit.\r\n * Licensed under the MIT License (MIT)\r\n * https://github.com/mdbassit/Coloris\r\n */\r\n!function(u,p,s,c){var d,f,h,i,b,y,v,m,g,l,w,k,L,E,a,n,r=p.createElement(\"canvas\").getContext(\"2d\"),x={r:0,g:0,b:0,h:0,s:0,v:0,a:1},A={},C={el:\"[data-coloris]\",parent:\"body\",theme:\"default\",themeMode:\"light\",rtl:!1,wrap:!0,margin:2,format:\"hex\",formatToggle:!1,swatches:[],swatchesOnly:!1,alpha:!0,forceAlpha:!1,focusInput:!0,selectInput:!1,inline:!1,defaultColor:\"#000000\",clearButton:!1,clearLabel:\"Clear\",closeButton:!1,closeLabel:\"Close\",onChange:function(){return c},a11y:{open:\"Open color picker\",close:\"Close color picker\",clear:\"Clear the selected color\",marker:\"Saturation: {s}. Brightness: {v}.\",hueSlider:\"Hue slider\",alphaSlider:\"Opacity slider\",input:\"Color value field\",format:\"Color format\",swatch:\"Color swatch\",instruction:\"Saturation and brightness selector. Use up, down, left and right arrow keys to select.\"}},o={},S=\"\",T={},B=!1;function M(t){if(\"object\"==typeof t)for(var e in t)switch(e){case\"el\":D(t.el),!1!==t.wrap&&R(t.el);break;case\"parent\":(d=t.parent instanceof HTMLElement?t.parent:p.querySelector(t.parent))&&(d.appendChild(f),C.parent=t.parent,d===p.body&&(d=c));break;case\"themeMode\":C.themeMode=t.themeMode,\"auto\"===t.themeMode&&u.matchMedia&&u.matchMedia(\"(prefers-color-scheme: dark)\").matches&&(C.themeMode=\"dark\");case\"theme\":t.theme&&(C.theme=t.theme),f.className=\"clr-picker clr-\"+C.theme+\" clr-\"+C.themeMode,C.inline&&j();break;case\"rtl\":C.rtl=!!t.rtl,Array.from(p.getElementsByClassName(\"clr-field\")).forEach(function(e){return e.classList.toggle(\"clr-rtl\",C.rtl)});break;case\"margin\":t.margin*=1,C.margin=(isNaN(t.margin)?C:t).margin;break;case\"wrap\":t.el&&t.wrap&&R(t.el);break;case\"formatToggle\":C.formatToggle=!!t.formatToggle,V(\"clr-format\").style.display=C.formatToggle?\"block\":\"none\",C.formatToggle&&(C.format=\"auto\");break;case\"swatches\":Array.isArray(t.swatches)&&function(){var e=V(\"clr-swatches\"),l=p.createElement(\"div\");e.textContent=\"\",t.swatches.forEach(function(e,t){var a=p.createElement(\"button\");a.setAttribute(\"type\",\"button\"),a.setAttribute(\"id\",\"clr-swatch-\"+t),a.setAttribute(\"aria-labelledby\",\"clr-swatch-label clr-swatch-\"+t),a.style.color=e,a.textContent=e,l.appendChild(a)}),t.swatches.length&&e.appendChild(l),C.swatches=t.swatches.slice()}();break;case\"swatchesOnly\":C.swatchesOnly=!!t.swatchesOnly,f.setAttribute(\"data-minimal\",C.swatchesOnly);break;case\"alpha\":C.alpha=!!t.alpha,f.setAttribute(\"data-alpha\",C.alpha);break;case\"inline\":C.inline=!!t.inline,f.setAttribute(\"data-inline\",C.inline),C.inline&&(l=t.defaultColor||C.defaultColor,E=P(l),j(),Y(l));break;case\"clearButton\":\"object\"==typeof t.clearButton&&(t.clearButton.label&&(C.clearLabel=t.clearButton.label,v.innerHTML=C.clearLabel),t.clearButton=t.clearButton.show),C.clearButton=!!t.clearButton,v.style.display=C.clearButton?\"block\":\"none\";break;case\"clearLabel\":C.clearLabel=t.clearLabel,v.innerHTML=C.clearLabel;break;case\"closeButton\":C.closeButton=!!t.closeButton,C.closeButton?f.insertBefore(m,b):b.appendChild(m);break;case\"closeLabel\":C.closeLabel=t.closeLabel,m.innerHTML=C.closeLabel;break;case\"a11y\":var a,l,r=t.a11y,n=!1;if(\"object\"==typeof r)for(var o in r)r[o]&&C.a11y[o]&&(C.a11y[o]=r[o],n=!0);n&&(a=V(\"clr-open-label\"),l=V(\"clr-swatch-label\"),a.innerHTML=C.a11y.open,l.innerHTML=C.a11y.swatch,m.setAttribute(\"aria-label\",C.a11y.close),v.setAttribute(\"aria-label\",C.a11y.clear),g.setAttribute(\"aria-label\",C.a11y.hueSlider),w.setAttribute(\"aria-label\",C.a11y.alphaSlider),y.setAttribute(\"aria-label\",C.a11y.input),h.setAttribute(\"aria-label\",C.a11y.instruction));break;default:C[e]=t[e]}}function H(e,t){\"string\"==typeof e&&\"object\"==typeof t&&(o[e]=t,B=!0)}function N(e){delete o[e],0===Object.keys(o).length&&(B=!1,e===S&&O())}function t(l){if(B){var e,r=[\"el\",\"wrap\",\"rtl\",\"inline\",\"defaultColor\",\"a11y\"];for(e in o)if(\"break\"===function(e){var t=o[e];if(l.matches(e)){for(var a in S=e,T={},r.forEach(function(e){return delete t[e]}),t)T[a]=Array.isArray(C[a])?C[a].slice():C[a];return M(t),\"break\"}}(e))break}}function O(){0<Object.keys(T).length&&(M(T),S=\"\",T={})}function D(e){e instanceof HTMLElement&&(e=[e]),Array.isArray(e)?e.forEach(function(e){Z(e,\"click\",I),Z(e,\"input\",q)}):(Z(p,\"click\",e,I),Z(p,\"input\",e,q))}function I(e){C.inline||(t(e.target),L=e.target,a=L.value,E=P(a),f.classList.add(\"clr-open\"),j(),Y(a),(C.focusInput||C.selectInput)&&(y.focus({preventScroll:!0}),y.setSelectionRange(L.selectionStart,L.selectionEnd)),C.selectInput&&y.select(),(n||C.swatchesOnly)&&Q().shift().focus(),L.dispatchEvent(new Event(\"open\",{bubbles:!0})))}function j(){var e,t,a,l,r=d,n=u.scrollY,o=f.offsetWidth,c=f.offsetHeight,i={left:!1,top:!1},s={x:0,y:0};r&&(a=u.getComputedStyle(r),e=parseFloat(a.marginTop),l=parseFloat(a.borderTopWidth),(s=r.getBoundingClientRect()).y+=l+n),C.inline||(a=(t=L.getBoundingClientRect()).x,l=n+t.y+t.height+C.margin,r?(a-=s.x,l-=s.y,a+o>r.clientWidth&&(a+=t.width-o,i.left=!0),l+c>r.clientHeight-e&&c+C.margin<=t.top-(s.y-n)&&(l-=t.height+c+2*C.margin,i.top=!0),l+=r.scrollTop):(a+o>p.documentElement.clientWidth&&(a+=t.width-o,i.left=!0),l+c-n>p.documentElement.clientHeight&&c+C.margin<=t.top&&(l=n+t.y-c-C.margin,i.top=!0)),f.classList.toggle(\"clr-left\",i.left),f.classList.toggle(\"clr-top\",i.top),f.style.left=a+\"px\",f.style.top=l+\"px\",s.x+=f.offsetLeft,s.y+=f.offsetTop),A={width:h.offsetWidth,height:h.offsetHeight,x:h.offsetLeft+s.x,y:h.offsetTop+s.y}}function R(e){e instanceof HTMLElement?W(e):(Array.isArray(e)?e:p.querySelectorAll(e)).forEach(W)}function W(e){var t,a,l=e.parentNode;l.classList.contains(\"clr-field\")||(t=p.createElement(\"div\"),a=\"clr-field\",(C.rtl||e.classList.contains(\"clr-rtl\"))&&(a+=\" clr-rtl\"),t.innerHTML='<button type=\"button\" aria-labelledby=\"clr-open-label\"></button>',l.insertBefore(t,e),t.className=a,t.style.color=e.value,t.appendChild(e))}function q(e){var t=e.target.parentNode;t.classList.contains(\"clr-field\")&&(t.style.color=e.target.value)}function F(e){var t;L&&!C.inline&&(t=L,e&&(L=c,a!==t.value&&(t.value=a,t.dispatchEvent(new Event(\"input\",{bubbles:!0})))),setTimeout(function(){a!==t.value&&t.dispatchEvent(new Event(\"change\",{bubbles:!0}))}),f.classList.remove(\"clr-open\"),B&&O(),t.dispatchEvent(new Event(\"close\",{bubbles:!0})),C.focusInput&&t.focus({preventScroll:!0}),L=c)}function Y(e){var t=function(e){r.fillStyle=\"#000\",r.fillStyle=e,e=(e=/^((rgba)|rgb)[\\D]+([\\d.]+)[\\D]+([\\d.]+)[\\D]+([\\d.]+)[\\D]*?([\\d.]+|$)/i.exec(r.fillStyle))?{r:+e[3],g:+e[4],b:+e[5],a:+e[6]}:(e=r.fillStyle.replace(\"#\",\"\").match(/.{2}/g).map(function(e){return parseInt(e,16)}),{r:e[0],g:e[1],b:e[2],a:1});return e}(e),e=function(e){var t=e.r/255,a=e.g/255,l=e.b/255,r=s.max(t,a,l),n=s.min(t,a,l),o=r-n,c=r,i=0,n=0;o&&(r===t&&(i=(a-l)/o),r===a&&(i=2+(l-t)/o),r===l&&(i=4+(t-a)/o),r&&(n=o/r));return{h:(i=s.floor(60*i))<0?i+360:i,s:s.round(100*n),v:s.round(100*c),a:e.a}}(t);G(e.s,e.v),z(t,e),g.value=e.h,f.style.color=\"hsl(\"+e.h+\", 100%, 50%)\",l.style.left=e.h/360*100+\"%\",i.style.left=A.width*e.s/100+\"px\",i.style.top=A.height-A.height*e.v/100+\"px\",w.value=100*e.a,k.style.left=100*e.a+\"%\"}function P(e){e=e.substring(0,3).toLowerCase();return\"rgb\"===e||\"hsl\"===e?e:\"hex\"}function U(e){e=e!==c?e:y.value,L&&(L.value=e,L.dispatchEvent(new Event(\"input\",{bubbles:!0}))),C.onChange&&C.onChange.call(u,e,L),p.dispatchEvent(new CustomEvent(\"coloris:pick\",{detail:{color:e,currentEl:L}}))}function X(e,t){e={h:+g.value,s:e/A.width*100,v:100-t/A.height*100,a:w.value/100},t=function(e){var t=e.s/100,a=e.v/100,l=t*a,r=e.h/60,n=l*(1-s.abs(r%2-1)),o=a-l;l+=o,n+=o;t=s.floor(r)%6,a=[l,n,o,o,n,l][t],r=[n,l,l,n,o,o][t],t=[o,o,n,l,l,n][t];return{r:s.round(255*a),g:s.round(255*r),b:s.round(255*t),a:e.a}}(e);G(e.s,e.v),z(t,e),U()}function G(e,t){var a=C.a11y.marker;e=+e.toFixed(1),t=+t.toFixed(1),a=(a=a.replace(\"{s}\",e)).replace(\"{v}\",t),i.setAttribute(\"aria-label\",a)}function K(e){var t={pageX:((a=e).changedTouches?a.changedTouches[0]:a).pageX,pageY:(a.changedTouches?a.changedTouches[0]:a).pageY},a=t.pageX-A.x,t=t.pageY-A.y;d&&(t+=d.scrollTop),$(a,t),e.preventDefault(),e.stopPropagation()}function $(e,t){e=e<0?0:e>A.width?A.width:e,t=t<0?0:t>A.height?A.height:t,i.style.left=e+\"px\",i.style.top=t+\"px\",X(e,t),i.focus()}function z(e,t){void 0===t&&(t={});var a,l,r=C.format;for(a in e=void 0===e?{}:e)x[a]=e[a];for(l in t)x[l]=t[l];var n,o=function(e){var t=e.r.toString(16),a=e.g.toString(16),l=e.b.toString(16),r=\"\";e.r<16&&(t=\"0\"+t);e.g<16&&(a=\"0\"+a);e.b<16&&(l=\"0\"+l);C.alpha&&(e.a<1||C.forceAlpha)&&(e=255*e.a|0,r=e.toString(16),e<16&&(r=\"0\"+r));return\"#\"+t+a+l+r}(x),c=o.substring(0,7);switch(i.style.color=c,k.parentNode.style.color=c,k.style.color=o,b.style.color=o,h.style.display=\"none\",h.offsetHeight,h.style.display=\"\",k.nextElementSibling.style.display=\"none\",k.nextElementSibling.offsetHeight,k.nextElementSibling.style.display=\"\",\"mixed\"===r?r=1===x.a?\"hex\":\"rgb\":\"auto\"===r&&(r=E),r){case\"hex\":y.value=o;break;case\"rgb\":y.value=(n=x,!C.alpha||1===n.a&&!C.forceAlpha?\"rgb(\"+n.r+\", \"+n.g+\", \"+n.b+\")\":\"rgba(\"+n.r+\", \"+n.g+\", \"+n.b+\", \"+n.a+\")\");break;case\"hsl\":y.value=(n=function(e){var t,a=e.v/100,l=a*(1-e.s/100/2);0<l&&l<1&&(t=s.round((a-l)/s.min(l,1-l)*100));return{h:e.h,s:t||0,l:s.round(100*l),a:e.a}}(x),!C.alpha||1===n.a&&!C.forceAlpha?\"hsl(\"+n.h+\", \"+n.s+\"%, \"+n.l+\"%)\":\"hsla(\"+n.h+\", \"+n.s+\"%, \"+n.l+\"%, \"+n.a+\")\")}p.querySelector('.clr-format [value=\"'+r+'\"]').checked=!0}function e(){var e=+g.value,t=+i.style.left.replace(\"px\",\"\"),a=+i.style.top.replace(\"px\",\"\");f.style.color=\"hsl(\"+e+\", 100%, 50%)\",l.style.left=e/360*100+\"%\",X(t,a)}function J(){var e=w.value/100;k.style.left=100*e+\"%\",z({a:e}),U()}function Q(){return Array.from(f.querySelectorAll(\"input, button\")).filter(function(e){return!!e.offsetWidth})}function V(e){return p.getElementById(e)}function Z(e,t,a,l){var r=Element.prototype.matches||Element.prototype.msMatchesSelector;\"string\"==typeof a?e.addEventListener(t,function(e){r.call(e.target,a)&&l.call(e.target,e)}):(l=a,e.addEventListener(t,l))}function _(e,t){t=t!==c?t:[],\"loading\"!==p.readyState?e.apply(void 0,t):p.addEventListener(\"DOMContentLoaded\",function(){e.apply(void 0,t)})}NodeList!==c&&NodeList.prototype&&!NodeList.prototype.forEach&&(NodeList.prototype.forEach=Array.prototype.forEach),u.Coloris=function(){var r={set:M,wrap:R,close:F,setInstance:H,removeInstance:N,updatePosition:j,ready:_};function e(e){_(function(){e&&(\"string\"==typeof e?D:M)(e)})}for(var t in r)!function(l){e[l]=function(){for(var e=arguments.length,t=new Array(e),a=0;a<e;a++)t[a]=arguments[a];_(r[l],t)}}(t);return e}(),_(function(){d=c,(f=p.createElement(\"div\")).setAttribute(\"id\",\"clr-picker\"),f.className=\"clr-picker\",f.innerHTML='<input id=\"clr-color-value\" name=\"clr-color-value\" class=\"clr-color\" type=\"text\" value=\"\" spellcheck=\"false\" aria-label=\"'+C.a11y.input+'\"><div id=\"clr-color-area\" class=\"clr-gradient\" role=\"application\" aria-label=\"'+C.a11y.instruction+'\"><div id=\"clr-color-marker\" class=\"clr-marker\" tabindex=\"0\"></div></div><div class=\"clr-hue\"><input id=\"clr-hue-slider\" name=\"clr-hue-slider\" type=\"range\" min=\"0\" max=\"360\" step=\"1\" aria-label=\"'+C.a11y.hueSlider+'\"><div id=\"clr-hue-marker\"></div></div><div class=\"clr-alpha\"><input id=\"clr-alpha-slider\" name=\"clr-alpha-slider\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" aria-label=\"'+C.a11y.alphaSlider+'\"><div id=\"clr-alpha-marker\"></div><span></span></div><div id=\"clr-format\" class=\"clr-format\"><fieldset class=\"clr-segmented\"><legend>'+C.a11y.format+'</legend><input id=\"clr-f1\" type=\"radio\" name=\"clr-format\" value=\"hex\"><label for=\"clr-f1\">Hex</label><input id=\"clr-f2\" type=\"radio\" name=\"clr-format\" value=\"rgb\"><label for=\"clr-f2\">RGB</label><input id=\"clr-f3\" type=\"radio\" name=\"clr-format\" value=\"hsl\"><label for=\"clr-f3\">HSL</label><span></span></fieldset></div><div id=\"clr-swatches\" class=\"clr-swatches\"></div><button type=\"button\" id=\"clr-clear\" class=\"clr-clear\" aria-label=\"'+C.a11y.clear+'\">'+C.clearLabel+'</button><div id=\"clr-color-preview\" class=\"clr-preview\"><button type=\"button\" id=\"clr-close\" class=\"clr-close\" aria-label=\"'+C.a11y.close+'\">'+C.closeLabel+'</button></div><span id=\"clr-open-label\" hidden>'+C.a11y.open+'</span><span id=\"clr-swatch-label\" hidden>'+C.a11y.swatch+\"</span>\",p.body.appendChild(f),h=V(\"clr-color-area\"),i=V(\"clr-color-marker\"),v=V(\"clr-clear\"),m=V(\"clr-close\"),b=V(\"clr-color-preview\"),y=V(\"clr-color-value\"),g=V(\"clr-hue-slider\"),l=V(\"clr-hue-marker\"),w=V(\"clr-alpha-slider\"),k=V(\"clr-alpha-marker\"),D(C.el),R(C.el),Z(f,\"mousedown\",function(e){f.classList.remove(\"clr-keyboard-nav\"),e.stopPropagation()}),Z(h,\"mousedown\",function(e){Z(p,\"mousemove\",K)}),Z(h,\"contextmenu\",function(e){e.preventDefault()}),Z(h,\"touchstart\",function(e){p.addEventListener(\"touchmove\",K,{passive:!1})}),Z(i,\"mousedown\",function(e){Z(p,\"mousemove\",K)}),Z(i,\"touchstart\",function(e){p.addEventListener(\"touchmove\",K,{passive:!1})}),Z(y,\"change\",function(e){var t=y.value;(L||C.inline)&&U(\"\"===t?t:Y(t))}),Z(v,\"click\",function(e){U(\"\"),F()}),Z(m,\"click\",function(e){U(),F()}),Z(V(\"clr-format\"),\"click\",\".clr-format input\",function(e){E=e.target.value,z(),U()}),Z(f,\"click\",\".clr-swatches button\",function(e){Y(e.target.textContent),U(),C.swatchesOnly&&F()}),Z(p,\"mouseup\",function(e){p.removeEventListener(\"mousemove\",K)}),Z(p,\"touchend\",function(e){p.removeEventListener(\"touchmove\",K)}),Z(p,\"mousedown\",function(e){n=!1,f.classList.remove(\"clr-keyboard-nav\"),F()}),Z(p,\"keydown\",function(e){var t,a=e.key,l=e.target,r=e.shiftKey;\"Escape\"===a?F(!0):[\"Tab\",\"ArrowUp\",\"ArrowDown\",\"ArrowLeft\",\"ArrowRight\"].includes(a)&&(n=!0,f.classList.add(\"clr-keyboard-nav\")),\"Tab\"===a&&l.matches(\".clr-picker *\")&&(a=(t=Q()).shift(),t=t.pop(),r&&l===a?(t.focus(),e.preventDefault()):r||l!==t||(a.focus(),e.preventDefault()))}),Z(p,\"click\",\".clr-field button\",function(e){B&&O(),e.target.nextElementSibling.dispatchEvent(new Event(\"click\",{bubbles:!0}))}),Z(i,\"keydown\",function(e){var t={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};Object.keys(t).includes(e.key)&&(!function(e,t){$(+i.style.left.replace(\"px\",\"\")+e,+i.style.top.replace(\"px\",\"\")+t)}.apply(void 0,t[e.key]),e.preventDefault())}),Z(h,\"click\",K),Z(g,\"input\",e),Z(w,\"input\",J)})}(window,document,Math);";

    var colorisCss = ".clr-picker{display:none;flex-wrap:wrap;position:absolute;width:200px;z-index:1000;border-radius:10px;background-color:#fff;justify-content:flex-end;direction:ltr;box-shadow:0 0 5px rgba(0,0,0,.05),0 5px 20px rgba(0,0,0,.1);-moz-user-select:none;-webkit-user-select:none;user-select:none}.clr-picker.clr-open,.clr-picker[data-inline=true]{display:flex}.clr-picker[data-inline=true]{position:relative}.clr-gradient{position:relative;width:100%;height:100px;margin-bottom:15px;border-radius:3px 3px 0 0;background-image:linear-gradient(rgba(0,0,0,0),#000),linear-gradient(90deg,#fff,currentColor);cursor:pointer}.clr-marker{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border:1px solid #fff;border-radius:50%;background-color:currentColor;cursor:pointer}.clr-picker input[type=range]::-webkit-slider-runnable-track{width:100%;height:16px}.clr-picker input[type=range]::-webkit-slider-thumb{width:16px;height:16px;-webkit-appearance:none}.clr-picker input[type=range]::-moz-range-track{width:100%;height:16px;border:0}.clr-picker input[type=range]::-moz-range-thumb{width:16px;height:16px;border:0}.clr-hue{background-image:linear-gradient(to right,red 0,#ff0 16.66%,#0f0 33.33%,#0ff 50%,#00f 66.66%,#f0f 83.33%,red 100%)}.clr-alpha,.clr-hue{position:relative;width:calc(100% - 40px);height:8px;margin:5px 20px;border-radius:4px}.clr-alpha span{display:block;height:100%;width:100%;border-radius:inherit;background-image:linear-gradient(90deg,rgba(0,0,0,0),currentColor)}.clr-alpha input[type=range],.clr-hue input[type=range]{position:absolute;width:calc(100% + 32px);height:16px;left:-16px;top:-4px;margin:0;background-color:transparent;opacity:0;cursor:pointer;appearance:none;-webkit-appearance:none}.clr-alpha div,.clr-hue div{position:absolute;width:16px;height:16px;left:0;top:50%;margin-left:-8px;transform:translateY(-50%);border:2px solid #fff;border-radius:50%;background-color:currentColor;box-shadow:0 0 1px #888;pointer-events:none}.clr-alpha div:before{content:'';position:absolute;height:100%;width:100%;left:0;top:0;border-radius:50%;background-color:currentColor}.clr-format{display:none;order:1;width:calc(100% - 40px);margin:0 20px 20px}.clr-segmented{display:flex;position:relative;width:100%;margin:0;padding:0;border:1px solid #ddd;border-radius:15px;box-sizing:border-box;color:#999;font-size:12px}.clr-segmented input,.clr-segmented legend{position:absolute;width:100%;height:100%;margin:0;padding:0;border:0;left:0;top:0;opacity:0;pointer-events:none}.clr-segmented label{flex-grow:1;margin:0;padding:4px 0;font-size:inherit;font-weight:400;line-height:initial;text-align:center;cursor:pointer}.clr-segmented label:first-of-type{border-radius:10px 0 0 10px}.clr-segmented label:last-of-type{border-radius:0 10px 10px 0}.clr-segmented input:checked+label{color:#fff;background-color:#666}.clr-swatches{order:2;width:calc(100% - 32px);margin:0 16px}.clr-swatches div{display:flex;flex-wrap:wrap;padding-bottom:12px;justify-content:center}.clr-swatches button{position:relative;width:20px;height:20px;margin:0 4px 6px 4px;padding:0;border:0;border-radius:50%;color:inherit;text-indent:-1000px;white-space:nowrap;overflow:hidden;cursor:pointer}.clr-swatches button:after{content:'';display:block;position:absolute;width:100%;height:100%;left:0;top:0;border-radius:inherit;background-color:currentColor;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}input.clr-color{order:1;width:calc(100% - 80px);height:32px;margin:15px 20px 20px auto;padding:0 10px;border:1px solid #ddd;border-radius:16px;color:#444;background-color:#fff;font-family:sans-serif;font-size:14px;text-align:center;box-shadow:none}input.clr-color:focus{outline:0;border:1px solid #1e90ff}.clr-clear,.clr-close{display:none;order:2;height:24px;margin:0 20px 20px;padding:0 20px;border:0;border-radius:12px;color:#fff;background-color:#666;font-family:inherit;font-size:12px;font-weight:400;cursor:pointer}.clr-close{display:block;margin:0 20px 20px auto}.clr-preview{position:relative;width:32px;height:32px;margin:15px 0 20px 20px;border-radius:50%;overflow:hidden}.clr-preview:after,.clr-preview:before{content:'';position:absolute;height:100%;width:100%;left:0;top:0;border:1px solid #fff;border-radius:50%}.clr-preview:after{border:0;background-color:currentColor;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}.clr-preview button{position:absolute;width:100%;height:100%;z-index:1;margin:0;padding:0;border:0;border-radius:50%;outline-offset:-2px;background-color:transparent;text-indent:-9999px;cursor:pointer;overflow:hidden}.clr-alpha div,.clr-color,.clr-hue div,.clr-marker{box-sizing:border-box}.clr-field{display:inline-block;position:relative;color:transparent}.clr-field input{margin:0;direction:ltr}.clr-field.clr-rtl input{text-align:right}.clr-field button{position:absolute;width:30px;height:100%;right:0;top:50%;transform:translateY(-50%);margin:0;padding:0;border:0;color:inherit;text-indent:-1000px;white-space:nowrap;overflow:hidden;pointer-events:none}.clr-field.clr-rtl button{right:auto;left:0}.clr-field button:after{content:'';display:block;position:absolute;width:100%;height:100%;left:0;top:0;border-radius:inherit;background-color:currentColor;box-shadow:inset 0 0 1px rgba(0,0,0,.5)}.clr-alpha,.clr-alpha div,.clr-field button,.clr-preview:before,.clr-swatches button{background-image:repeating-linear-gradient(45deg,#aaa 25%,transparent 25%,transparent 75%,#aaa 75%,#aaa),repeating-linear-gradient(45deg,#aaa 25%,#fff 25%,#fff 75%,#aaa 75%,#aaa);background-position:0 0,4px 4px;background-size:8px 8px}.clr-marker:focus{outline:0}.clr-keyboard-nav .clr-alpha input:focus+div,.clr-keyboard-nav .clr-hue input:focus+div,.clr-keyboard-nav .clr-marker:focus,.clr-keyboard-nav .clr-segmented input:focus+label{outline:0;box-shadow:0 0 0 2px #1e90ff,0 0 2px 2px #fff}.clr-picker[data-alpha=false] .clr-alpha{display:none}.clr-picker[data-minimal=true]{padding-top:16px}.clr-picker[data-minimal=true] .clr-alpha,.clr-picker[data-minimal=true] .clr-color,.clr-picker[data-minimal=true] .clr-gradient,.clr-picker[data-minimal=true] .clr-hue,.clr-picker[data-minimal=true] .clr-preview{display:none}.clr-dark{background-color:#444}.clr-dark .clr-segmented{border-color:#777}.clr-dark .clr-swatches button:after{box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}.clr-dark input.clr-color{color:#fff;border-color:#777;background-color:#555}.clr-dark input.clr-color:focus{border-color:#1e90ff}.clr-dark .clr-preview:after{box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}.clr-dark .clr-alpha,.clr-dark .clr-alpha div,.clr-dark .clr-preview:before,.clr-dark .clr-swatches button{background-image:repeating-linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#888 75%,#888),repeating-linear-gradient(45deg,#888 25%,#444 25%,#444 75%,#888 75%,#888)}.clr-picker.clr-polaroid{border-radius:6px;box-shadow:0 0 5px rgba(0,0,0,.1),0 5px 30px rgba(0,0,0,.2)}.clr-picker.clr-polaroid:before{content:'';display:block;position:absolute;width:16px;height:10px;left:20px;top:-10px;border:solid transparent;border-width:0 8px 10px 8px;border-bottom-color:currentColor;box-sizing:border-box;color:#fff;filter:drop-shadow(0 -4px 3px rgba(0,0,0,.1));pointer-events:none}.clr-picker.clr-polaroid.clr-dark:before{color:#444}.clr-picker.clr-polaroid.clr-left:before{left:auto;right:20px}.clr-picker.clr-polaroid.clr-top:before{top:auto;bottom:-10px;transform:rotateZ(180deg)}.clr-polaroid .clr-gradient{width:calc(100% - 20px);height:120px;margin:10px;border-radius:3px}.clr-polaroid .clr-alpha,.clr-polaroid .clr-hue{width:calc(100% - 30px);height:10px;margin:6px 15px;border-radius:5px}.clr-polaroid .clr-alpha div,.clr-polaroid .clr-hue div{box-shadow:0 0 5px rgba(0,0,0,.2)}.clr-polaroid .clr-format{width:calc(100% - 20px);margin:0 10px 15px}.clr-polaroid .clr-swatches{width:calc(100% - 12px);margin:0 6px}.clr-polaroid .clr-swatches div{padding-bottom:10px}.clr-polaroid .clr-swatches button{width:22px;height:22px}.clr-polaroid input.clr-color{width:calc(100% - 60px);margin:10px 10px 15px auto}.clr-polaroid .clr-clear{margin:0 10px 15px 10px}.clr-polaroid .clr-close{margin:0 10px 15px auto}.clr-polaroid .clr-preview{margin:10px 0 15px 10px}.clr-picker.clr-large{width:275px}.clr-large .clr-gradient{height:150px}.clr-large .clr-swatches button{width:22px;height:22px}.clr-picker.clr-pill{width:380px;padding-left:180px;box-sizing:border-box}.clr-pill .clr-gradient{position:absolute;width:180px;height:100%;left:0;top:0;margin-bottom:0;border-radius:3px 0 0 3px}.clr-pill .clr-hue{margin-top:20px}\r\n\r\n\r\n.color-picker-input{\r\n    position: fixed;\r\n    border : none;\r\n    outline : none;\r\n    padding : 0;\r\n    margin: 0;\r\n    max-width : 0;\r\n    max-height: 0;\r\n    background : transparent;\r\n}";

    leistrap.addCss(colorisCss);
    document.body.append(leistrap.create("script", { text: COLORIS }).render());

    const ColorisPicker = function (listener) {
       Coloris.setInstance(`.color-picker`, {
            inline: true,
            theme: 'polaroid',
            themeMode: 'light',
            alpha: true,
            formatToggle: true,
            onChange: listener
        });

        //close colorPicker

        leistrap.event.handle("colorPicker:close", function(){
            Coloris.close();
        });
    };

    var inputCss = ".leis-card-radioBtns-container,\r\n.leis-card-checkboxBtns-container,\r\n.leis-card-switchboxBtns-container {\r\n    position: relative;\r\n    width: 100%;\r\n    display: flex;\r\n    flex-direction: column;\r\n    flex-wrap: wrap;\r\n    margin-bottom: 0.2rem;\r\n    gap: 0.255rem;\r\n}\r\n\r\n.leis-card-radioBtns-container *>label,\r\n.leis-card-checkboxBtns-container *>label,\r\n.leis-card-switchboxBtns-container *>label,\r\n.leis-textboxinput-container *>label {\r\n    font-size: inherit;\r\n    font-weight: inherit;\r\n}\r\n\r\n.leis-radioBtns-card,\r\n.leis-checkboxBtns-card,\r\n.leis-switchboxBtns-card {\r\n    position: relative;\r\n    width: auto;\r\n    display: flex;\r\n    flex-direction: row;\r\n    text-overflow: ellipsis;\r\n    justify-content: start;\r\n    flex-wrap: wrap;\r\n    gap: 0.255rem;\r\n}\r\n\r\n.leis-radioBtn,\r\n.leis-checkboxtBtn,\r\n.leis-switchboxtBtn {\r\n    appearance: none;\r\n    font-size: inherit;\r\n    font-weight: inherit;\r\n}\r\n\r\n\r\n\r\n.leis-radioBtn::after,\r\n.leis-checkboxtBtn,\r\n.leis-switchboxtBtn {\r\n    display: inline-block;\r\n    content: \"\";\r\n    width: 15px;\r\n    height: 15px;\r\n    background-color: inherit;\r\n    border-radius: 50%;\r\n    border: 1px solid #aaa;\r\n\r\n}\r\n\r\n.leis-checkboxtBtn {\r\n    top: 5px;\r\n    border: 1px solid #aaa;\r\n    outline: none;\r\n    border-radius: 0.222em;\r\n}\r\n\r\n.leis-switchboxtBtn {\r\n    top: 7px;\r\n    height: 15px;\r\n    width: 30px;\r\n    outline: none;\r\n    border-radius: 7px;\r\n}\r\n\r\n.leis-switchboxtBtn::after {\r\n    content: \"\";\r\n    display: inline-block;\r\n    position: absolute;\r\n    width: 10px;\r\n    height: 10px;\r\n    top: 15%;\r\n    left: 8%;\r\n    border-radius: 50%;\r\n    background-color: #aaa;\r\n    transition: left .3s ease;\r\n}\r\n\r\n.leis-checkboxtBtn:checked,\r\n.leis-switchboxtBtn:checked {\r\n    outline: none;\r\n    background-color: #007bff;\r\n    filter: brightness(100%);\r\n}\r\n\r\n.leis-switchboxtBtn:checked::after {\r\n    left: 52%;\r\n    background-color: #fff;\r\n}\r\n\r\n.leis-checkboxtBtn:focus,\r\n.leis-switchboxtBtn:focus {\r\n    box-shadow: 0 0 0 .25rem rgba(13, 110, 253, .25);\r\n}\r\n\r\n.leis-checkboxtBtn:checked::after {\r\n    content: \"\";\r\n    display: inline-block;\r\n    position: absolute;\r\n    width: 8px;\r\n    height: 5px;\r\n    left: calc(50% - 5px);\r\n    top: 20%;\r\n    border-left: 2px solid #fff;\r\n    border-bottom: 2px solid #fff;\r\n    transform: rotateZ(-60deg);\r\n\r\n}\r\n\r\n.leis-radioBtn:checked::after {\r\n    border: 0.333em solid #007bff;\r\n    filter: brightness(100%);\r\n}\r\n\r\n.leis-radioBtn:focus::after {\r\n    outline: none;\r\n    box-shadow: 0 0 0 .25rem rgba(13, 110, 253, .25)\r\n}\r\n\r\n\r\n.leis-textboxinput-container {\r\n    width: 100%;\r\n    height: auto;\r\n    padding: none;\r\n    margin: 0;\r\n    margin-bottom: 0.2rem;\r\n    padding-top: 0.5rem;\r\n}\r\n\r\n.leis-textbox-card {\r\n    position: relative;\r\n    width: 100%;\r\n    display: flex;\r\n    flex-direction: row-reverse;\r\n    justify-content: start;\r\n    flex-wrap: wrap-reverse;\r\n    gap: 0.5rem;\r\n    margin-bottom: 0.5rem;\r\n}\r\n\r\n.leis-textbox-card label {\r\n    display: flex;\r\n    justify-content: start;\r\n    align-content: center;\r\n}\r\n";

    leistrap.addCss(inputCss);

    /**
     * this, is for radio btn n switchbox, checkbox inputs
     * @param {string} label  the text to show next to the inputs
     * @param {()=> void} onActive  the active listener
     * @param {()=>void} onDisable  the disable listener
     */
    function ActiveAndDisableInputType(type, inputClass, cdClass, parent, label, onActive, onDisable) {

        let event_ = setActiveANdDisableEvent(onActive);

        const input = leistrap.create('input',
            { type, className: inputClass });


        const inputLabel = leistrap.create("label",
            { text: label }).addAttr("for", input.key);


        const container = leistrap.create("div",
            {
                parent, className: cdClass,
                content: [inputLabel, input]
            });


        // add listeners onActive and onDisable events
        input.addEvent('click', function (e) {
            if (e.target.checked) {
                event_.eventMap.active.forEach(item => item.call(input));
            }
            else { event_.eventMap.disable.forEach(item => item.call(input)); }
        });

        // destroying the component

        function destroy() {
            container.removeAll();
            container.destroy();
            loopObject(INPUT, function (value, key) {
                delete INPUT[key];
            });
        }
        const INPUT = {
            container,
            label: inputLabel,
            input,
            on: event_.on,
            destroy
        };

        INPUT.render = () => container.render();
        return INPUT
    }



    // control the active ans disable event listeners
    function setActiveANdDisableEvent(onActive, onDisable) {

        // switchBox events
        const eventMap = { active: [], disable: [] };

        if (onActive) isFunction(onActive) ? eventMap.active.push(onActive) : null;
        /**
      * 
      * @param {"active"|"disable"} eventType  event type
      * @param {()=>void} listener  event listner
      */
        function on(eventType, listener) {
            if (isString(eventType) && isFunction(listener)) {
                if (has(eventType, eventMap)) eventMap[eventType].push(listener);
            }
        }
        return { on, eventMap }


    }


    /**
     * leistrap buttonRadio component
     * @param {string} label  the text to show next to the inputs
     * @param {()=> void} onActive  the active listener
     * @param {()=>void} onDisable  the disable listener
     * @param {leistrap.Leistrap<HTMLInputElement>} parent 
     */
    function btnRadio(parent, label, onActive, onDisable) {
        return ActiveAndDisableInputType(
            "radio",
            "leis-radioBtn",
            "leis-radioBtns-card",
            parent,
            label,
            onActive)
    }


    // leistrap text Type inputs
    function setTextInputType(type, inputClass, cdClass, parent, label, textArea) {
        const container = leistrap.create("div", { parent, className: cdClass });
        const labelText = leistrap.create("label", { text: label, parent: container });
        const input = leistrap.create(textArea ?  "textarea" :"input",
            { parent: container }).setClassName(inputClass);

        if(!textArea) input.addAttr({type});
        labelText.addAttr('for', input.key);

        // destroying the component
        function destroy() {
            container.removeAll();
            container.destroy();
            loopObject(TEXT, function (value, key) {
                delete TEXT[key];
            });
        }
        const TEXT = {
            label: labelText,
            container,
            input,
            destroy
        };

        return TEXT
    }

    /**
     *  leistrap textBix component
     * @param {leistrap.Leistrap<HTMLInputElement>} parent 
     * @param {string} label 
     */
    function textBox(parent, label) {
        return setTextInputType(
            "text",
            "leis-textinput",
            "leis-textbox-card",
            parent,
            label
        )
    }

    /**
     *  leistrap textBix component
     * @param {leistrap.Leistrap<HTMLInputElement>} parent 
     * @param {string} label 
     */
    function leisTextArea(parent, label) {
        return setTextInputType(
            "text",
            "leis-textinput",
            "leis-textbox-card",
            parent,
            label,
            true
        )
    }

    var leisButtonCss = ":root{\r\n    --leis-primary-cl: #2c7be5;\r\n    --leis-primary-hover-cl: #1457b0;\r\n    --leis-primary-focus-bx-sh: 0 0 0 3px #007bff80;\r\n    --leis-primary-bd-hv-cl: #0062cc;\r\n    --leis-primary-bd-cl: #007bff;\r\n    --leis-primary-bd-fc-cl: #98caff;\r\n\r\n    --leis-secondary-cl: #868e96;\r\n    --leis-secondary-hover-cl: #717171;\r\n    --leis-primary-bd-cl: #868e96;\r\n    --leis-secondary-focus-bx-sh: 0 0 0 3px #a4acb5;\r\n    --leis-secondary-bd-hv-cl: #b0b6bc;\r\n    --leis-secondary-bd-fc-cl: #e4ecf5;\r\n\r\n    --leis-success-cl: #28a745;\r\n    --leis-success-hover-cl: #25933e;\r\n    --leis-success-bd-cl: #28a745;\r\n    --leis-success-focus-bx-sh: 0 0 0 3px #39c55a;\r\n    --leis-seccess-bd-hv-cl: #39da5e;\r\n\r\n\r\n    --leis-custom-success-cl: #2e443d;\r\n    --leis-custom-success-bd-cl: #83c89b;\r\n    --leis-custom-success-text-cl: #45875b;\r\n\r\n    --leis-warning-cl: #ffc107;\r\n    --leis-warning-hover-cl: #f0c648;\r\n    --leis-warning-bd-cl: #ffc107;\r\n    --leis-warning-focus-bx-sh: 0 0 0 3px #ffd24d;\r\n    --leis-warning-bd-hv-cl: #e5ba3b;\r\n\r\n    --leis-danger-cl: #dc3545;\r\n    --leis-danger-hover-cl: #ce2c3c;\r\n    --leis-danger-bd-cl: #dc3545;\r\n    --leis-danger-focus-bx-sh: 0 0 0 3px #f3384a;\r\n    --leis-danger-bd-hv-cl: #f3384a;\r\n\r\n    --leis-info-cl: #abdde5;\r\n    --leis-info-hover-cl: #89cdd7;\r\n    --leis-info-bd-cl: #abdde5;\r\n    --leis-info-focus-bx-sh: 0 0 0 3px #c6f5fc;\r\n    --leis-info-bd-hv-cl: #c6f5fc;\r\n\r\n    --leis-light-cl: #fefeff;\r\n    --leis-light-hover-cl: #dddde2;\r\n    --leis-light-bd-cl: #d8d8de;\r\n    --leis-light-focus-bx-sh: 0 0 0 3px #dffafd;\r\n    --leis-light-bd-hv-cl: #dffafd;\r\n\r\n    --leis-dark-cl: #23272b;\r\n    --leis-dark-hover-cl: #485157;\r\n    --leis-dark-bd-cl: #424950;\r\n    --leis-dark-focus-bx-sh: 0 0 0 3px #48525b;\r\n    --leis-dark-bd-hv-cl: #515960;\r\n\r\n    --leis-btn-bos-sh : 0 0 0 3px  var(--leis-baseColor);\r\n}\r\n\r\n\r\n\r\n\r\n.leis-btn,\r\n.leis-dropBtn {\r\n    outline: none;\r\n    border: 1px solid #1c7230ec;;\r\n    background-color: inherit;\r\n    cursor: pointer;\r\n    padding: 4px 16px;\r\n    appearance: none;\r\n    border-radius: 6px;\r\n    display: inline-block;\r\n    position: relative;\r\n    -webkit-user-select: none;\r\n    -ms-user-select: none;\r\n    -moz-user-select: none;\r\n    touch-action: manipulation;\r\n    vertical-align: middle;\r\n    white-space: nowrap;\r\n    font-size: 1rem;\r\n    font-family: inherit;\r\n    word-wrap: break-word;\r\n    overflow: hidden;\r\n    text-overflow: ellipsis;\r\n    transition: color .15s ease, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;\r\n}\r\n\r\n.leis-btn:focus{\r\n    -webkit-box-shadow: var(--leis-btn-bos-sh);\r\n    box-shadow: var(--leis-btn-bos-sh);\r\n    border-color: transparent;\r\n\r\n}\r\n\r\n.leis-btn-close {\r\n    border: 2px solid #dddddd90;\r\n    outline: none;\r\n    background-color: inherit;\r\n    cursor: pointer;\r\n    font-size: 1.5rem;\r\n    padding-left: 8px;\r\n    padding-right: 8px;\r\n    padding-bottom: 2px;\r\n    border-radius: 8px;\r\n}\r\n\r\n\r\n.leis-dropBtn {\r\n    gap: 10px;\r\n}\r\n\r\n\r\n\r\n.leis-btn-primary,\r\n.leis-dropBtn-primary {\r\n    background-color: var(--leis-primary-cl);\r\n    color: #fff !important;\r\n    border-radius: 6px;\r\n    border-width: 0.5px;\r\n    border-color: var(--leis-primary-bd-cl);\r\n}\r\n\r\n.leis-btn-primary:hover,    \r\n.leis-dropBtn-primary:hover {\r\n    background-color: var(--leis-primary-hover-cl);\r\n    color: #fff;\r\n\r\n}\r\n\r\n.leis-btn-primary:focus,\r\n.leis-dropBtn-primary:focus,\r\n.leis-btn-primary.focus,\r\n.leis-dropBtn-primary.focus {\r\n    -webkit-box-shadow: var(--leis-primary-focus-bx-sh);\r\n    -o-box-shadow: var(--leis-primary-focus-bx-sh);\r\n    box-shadow: var(--leis-primary-focus-bx-sh);\r\n}\r\n\r\n.leis-btn-primary:focus:hover {\r\n    border: 1px solid var(--leis-primary-bd-fc-cl);\r\n}\r\n\r\n.leis-btn-secondary,\r\n.leis-dropBtn-secondary {\r\n    background-color: var(--leis-secondary-cl);\r\n    color: #fff !important;\r\n    border-radius: 6px;\r\n    border: 0.5px solid var(--leis-secondary-bd-cl);\r\n}\r\n\r\n.leis-btn-secondary:hover,\r\n.leis-dropBtn-secondary:hover {\r\n    background-color: var(--leis-secondary-hover-cl);\r\n\r\n}\r\n\r\n.leis-btn-secondary:focus,\r\n.leis-btn-secondary.focus,\r\n.leis-dropBtn-secondary:focus,\r\n.leis-dropBtn-secondary.focus,\r\n.leis-btn-close:focus {\r\n    -webkit-box-shadow: var(--leis-secondary-focus-bx-sh);\r\n    -o-box-shadow: var(--leis-secondary-focus-bx-sh);\r\n    box-shadow: var(--leis-secondary-focus-bx-sh);\r\n    border: 1px solid var(--leis-secondary-bd-cl);\r\n    transition: .2s ease-in;\r\n}\r\n\r\n\r\n.leis-btn-secondary:focus:hover {\r\n    border: 1px solid var(--leis-secondary-bd-fc-cl);\r\n\r\n}\r\n\r\n.leis-btn-success,\r\n.leis-dropBtn-success {\r\n    background-color: var(--leis-success-cl);\r\n    color: #fff !important;\r\n    border-radius: 6px;\r\n    border-width: 0.5px;\r\n    border-color: var(--leis-success-bd-cl);\r\n}\r\n\r\n.leis-btn-success:hover,\r\n.leis-dropBtn-success:hover {\r\n    background-color: var(--leis-success-hover-cl);\r\n\r\n}\r\n\r\n.leis-btn-success:focus,\r\n.leis-btn-success.focus,\r\n.leis-dropBtn-success:focus,\r\n.leis-dropBtn-success.focus {\r\n    -webkit-box-shadow: var(--leis-success-focus-bx-sh);\r\n    -o-box-shadow: var(--leis-success-focus-bx-sh);\r\n    box-shadow: var(--leis-success-focus-bx-sh);\r\n}\r\n\r\n.leis-btn-success:focus:hover {\r\n    border: 1px solid var(--leis-custom-success-bd-cl);\r\n}\r\n\r\n.leis-btn-warning,\r\n.leis-dropBtn-warning {\r\n    background-color: var(--leis-warning-cl);\r\n    color: black !important;\r\n    border-radius: 6px;\r\n    border-width: 0.5px;\r\n    border-color: var(--leis-warning-bd-cl);\r\n}\r\n\r\n.leis-btn-warning:hover,\r\n.leis-dropBtn-warning:hover {\r\n    background-color: var(--leis-warning-hover-cl);\r\n    border-color: var(--leis-warning-bd-hv-cl)\r\n}\r\n\r\n.leis-btn-warning:focus,\r\n.leis-btn-warning.focus,\r\n.leis-dropBtn-warning:focus,\r\n.leis-dropBtn-warning.focus {\r\n    -webkit-box-shadow: var(--leis-warning-focus-bx-sh);\r\n    -o-box-shadow: var(--leis-warning-focus-bx-sh);\r\n    box-shadow: var(--leis-warning-focus-bx-sh);\r\n}\r\n\r\n.leis-btn-danger,\r\n.leis-dropBtn-danger {\r\n    background-color: var(--leis-danger-cl);\r\n    color: white !important;\r\n    border-radius: 6px;\r\n    border-width: 0.5px;\r\n    border-color: var(--leis-danger-bd-cl);\r\n}\r\n\r\n.leis-btn-danger:hover,\r\n.leis-dropBtn-danger:hover {\r\n    background-color: var(--leis-danger-hover-cl);\r\n    border-color: var(--leis-danger-bd-hv-cl)\r\n}\r\n\r\n.leis-btn-danger:focus,\r\n.leis-btn-danger.focus,\r\n.leis-dropBtn-danger:focus,\r\n.leis-dropBtn-danger.focus {\r\n    -webkit-box-shadow: var(--leis-danger-focus-bx-sh);\r\n    -o-box-shadow: var(--leis-danger-focus-bx-sh);\r\n    box-shadow: var(--leis-danger-focus-bx-sh);\r\n}\r\n\r\n.leis-btn-info,\r\n.leis-dropBtn-info {\r\n    background-color: var(--leis-info-cl);\r\n    color: black !important;\r\n    border-radius: 6px;\r\n    border-width: 0.5px;\r\n    border-color: var(--leis-info-bd-cl);\r\n}\r\n\r\n.leis-btn-info:hover,\r\n.leis-dropBtn-info:hover {\r\n    background-color: var(--leis-info-hover-cl);\r\n    border-color: var(--leis-info-bd-hv-cl)\r\n}\r\n\r\n.leis-btn-info:focus,\r\n.leis-btn-info.focus,\r\n.leis-dropBtn-info:focus,\r\n.leis-dropBtn-info.focus {\r\n    -webkit-box-shadow: var(--leis-info-focus-bx-sh);\r\n    -o-box-shadow: var(--leis-info-focus-bx-sh);\r\n    box-shadow: var(--leis-info-focus-bx-sh);\r\n}\r\n\r\n.leis-btn-light,\r\n.leis-dropBtn-light {\r\n    background-color: var(--leis-light-cl);\r\n    color: black !important;\r\n    border-radius: 6px;\r\n    border-width: 0.5px;\r\n    border-color: var(--leis-light-bd-cl);\r\n}\r\n\r\n.leis-btn-light:hover,\r\n.leis-dropBtn-light:hover {\r\n    background-color: var(--leis-light-hover-cl);\r\n    border-color: var(--leis-light-bd-hv-cl)\r\n}\r\n\r\n.leis-btn-light:focus,\r\n.leis-btn-light.focus,\r\n.leis-dropBtn-light:focus,\r\n.leis-dropBtn-light.focus {\r\n    -webkit-box-shadow: var(--leis-light-focus-bx-sh);\r\n    -o-box-shadow: var(--leis-light-focus-bx-sh);\r\n    box-shadow: var(--leis-light-focus-bx-sh);\r\n}\r\n\r\n.leis-btn-dark,\r\n.leis-dropBtn-dark {\r\n    background-color: var(--leis-dark-cl);\r\n    color: #ddd !important;\r\n    border-radius: 6px;\r\n    border-width: 0.5px;\r\n    border-color: var(--leis-dark-bd-cl);\r\n}\r\n\r\n.leis-btn-dark:hover,\r\n.leis-dropBtn-dark:hover {\r\n    background-color: var(--leis-dark-hover-cl);\r\n    border-color: var(--leis-dark-bd-hv-cl)\r\n}\r\n\r\n.leis-btn-dark:focus,\r\n.leis-btn-dark.focus,\r\n.leis-dropBtn-dark:focus {\r\n    -webkit-box-shadow: var(--leis-dark-focus-bx-sh);\r\n    -o-box-shadow: var(--leis-dark-focus-bx-sh);\r\n    box-shadow: var(--leis-dark-focus-bx-sh);\r\n}\r\n\r\n.leis-outline-btn-primary {\r\n    border-color: var(--leis-primary-cl);\r\n    background-color: transparent !important;\r\n    color: var(--leis-primary-cl) !important;\r\n    -webkit-box-shadow: var(--leis-primary-cl) 0 0 2px inset;\r\n    box-shadow: var(--leis-primary-cl) 0 0 2px inset;\r\n}\r\n\r\n.leis-outline-btn-primary:hover,\r\n.leis-outline-btn-primary.focus,\r\n.leis-outline-btn-primary:focus {\r\n    color: #fff !important;\r\n    background-color: var(--leis-primary-cl) !important;\r\n}\r\n\r\n.leis-outline-btn-secondary {\r\n    border-color: var(--leis-secondary-cl);\r\n    background-color: transparent !important;\r\n    color: var(--leis-secondary-cl) !important;\r\n    -webkit-box-shadow: var(--leis-secondary-cl) 0 0 3px inset;\r\n    box-shadow: var(--leis-secondary-cl) 0 0 2px inset;\r\n}\r\n\r\n.leis-outline-btn-secondary:hover,\r\n.leis-outline-btn-secondary.focus,\r\n.leis-outline-btn-secondary:focus {\r\n    color: #fff !important;\r\n    background-color: var(--leis-secondary-cl) !important;\r\n}\r\n\r\n.leis-outline-btn-dark {\r\n    border-color: var(--leis-dark-cl);\r\n    background-color: transparent !important;\r\n    color: #9c9999 !important;\r\n    -webkit-box-shadow: var(--leis-dark-cl) 0 0 3px inset;\r\n    box-shadow: var(--leis-dark-cl) 0 0 2px inset;\r\n}\r\n\r\n.leis-outline-btn-dark:hover,\r\n.leis-outline-btn-dark.focus,\r\n.leis-outline-btn-dark:focus {\r\n    color: #fff !important;\r\n    background-color: var(--leis-dark-cl) !important;\r\n}\r\n\r\n.leis-outline-btn-light {\r\n    border-color: var(--leis-light-cl);\r\n    background-color: transparent !important;\r\n    color: var(--leis-primary-bd-hv-cl) !important;\r\n    -webkit-box-shadow: #ccc 0 0 3px inset;\r\n    box-shadow: #ccc 0 0 2px inset;\r\n}\r\n\r\n.leis-outline-btn-light:hover,\r\n.leis-outline-btn-light.focus,\r\n.leis-outline-btn-light:focus {\r\n    color: var(--leis-primary-bd-hv-cl) !important;\r\n    background-color: var(--leis-light-cl) !important;\r\n}\r\n\r\n.leis-outline-btn-success {\r\n    border-color: var(--leis-success-cl);\r\n    background-color: transparent !important;\r\n    color: var(--leis-success-cl) !important;\r\n    -webkit-box-shadow: var(--leis-success-cl) 0 0 3px inset;\r\n    box-shadow: var(--leis-success-cl) 0 0 2px inset;\r\n}\r\n\r\n.leis-outline-btn-success:hover,\r\n.leis-outline-btn-success.focus,\r\n.leis-outline-btn-success:focus {\r\n    color: #fff !important;\r\n    background-color: var(--leis-success-cl) !important;\r\n}\r\n\r\n.leis-outline-btn-info {\r\n    border-color: var(--leis-info-cl);\r\n    background-color: transparent !important;\r\n    color: var(--leis-info-hover-cl) !important;\r\n    -webkit-box-shadow: var(--leis-info-cl) 0 0 3px inset;\r\n    box-shadow: var(--leis-info-cl) 0 0 2px inset;\r\n}\r\n\r\n.leis-outline-btn-info:hover,\r\n.leis-outline-btn-info.focus,\r\n.leis-outline-btn-info:focus {\r\n    color: black !important;\r\n    background-color: var(--leis-info-cl) !important;\r\n}\r\n\r\n.leis-outline-btn-warning {\r\n    border-color: var(--leis-warning-cl);\r\n    background-color: transparent !important;\r\n    color: var(--leis-warning-cl) !important;\r\n    -webkit-box-shadow: var(--leis-warning-cl) 0 0 3px inset;\r\n    box-shadow: var(--leis-warning-cl) 0 0 2px inset;\r\n}\r\n\r\n.leis-outline-btn-warning:hover,\r\n.leis-outline-btn-warning.focus,\r\n.leis-outline-btn-warning:focus {\r\n    color: black !important;\r\n    background-color: var(--leis-warning-cl) !important;\r\n}\r\n\r\n.leis-outline-btn-danger {\r\n    border-color: var(--leis-danger-cl);\r\n    background-color: transparent !important;\r\n    color: var(--leis-danger-cl) !important;\r\n    -webkit-box-shadow: var(--leis-danger-cl) 0 0 3px inset;\r\n    box-shadow: var(--leis-danger-cl) 0 0 2px inset;\r\n}\r\n\r\n.leis-outline-btn-danger:hover,\r\n.leis-outline-btn-danger.focus,\r\n.leis-outline-btn-danger:focus {\r\n    color: #fff !important;\r\n    background-color: var(--leis-danger-cl) !important;\r\n}\r\n\r\n.leis-btn.leis-btn-small,\r\n.leis-btn-primary.leis-btn-small,\r\n.leis-btn-secondary.leis-btn-small,\r\n.leis-btn-success.leis-btn-small,\r\n.leis-btn-info.leis-btn-small,\r\n.leis-btn-danger.leis-btn-small,\r\n.leis-btn-warning.leis-btn-small,\r\n.leis-btn-light.leis-btn-small,\r\n.leis-btn-dark.leis-btn-small {\r\n    padding: 2px 10px;\r\n    font-size: 1rem;\r\n}\r\n\r\n.leis-btn.leis-btn-large,\r\n.leis-btn-primary.leis-btn-large,\r\n.leis-btn-secondary.leis-btn-large,\r\n.leis-btn-success.leis-btn-large,\r\n.leis-btn-info.leis-btn-large,\r\n.leis-btn-danger.leis-btn-large,\r\n.leis-btn-warning.leis-btn-large,\r\n.leis-btn-light.leis-btn-large,\r\n.leis-btn-dark.leis-btn-large {\r\n    padding: 0.555rem 16px;\r\n    font-size: 1.22rem;\r\n    font-weight: inherit;\r\n    min-width: 140px;\r\n}\r\n\r\n.leis-btn-icon {\r\n    font-size: inherit;\r\n    color: inherit;\r\n    font-weight: inherit;\r\n}\r\n\r\n.leis-btn-w-icon {\r\n    display: flex;\r\n    gap: 0.5rem;\r\n}\r\n";

    let init = false;
    let leisButton = () => {
        if (!init) {
            init = true;
            return leisButtonCss
        }
        return null
    };

    var autCss = "\r\n\r\n/*autocomplete*/\r\n.leis-autoComplete{\r\n    position: relative;\r\n    width: 100%;\r\n}\r\n.lis-autoListItem {\r\n    position: absolute;\r\n    width: 100%;\r\n    border: 1px solid #ddd;\r\n    background-color: #fff;\r\n    border-radius: 6px;\r\n    z-index: 1;\r\n    /* -webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);\r\n    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) */\r\n}\r\n\r\n .autoItem{\r\n    padding: 6px 10px;\r\n    cursor: pointer;\r\n    border: 1px solid #f6f3f3a3;\r\n    display: flex;\r\n    gap: 10px; \r\n }\r\n\r\n .autoItem:hover{\r\n    background-color: var(--leis-select-cl);\r\n }";

    leistrap.addCss(autCss);
    /**
     * 
     * @param {leistrap.Leistrap<HTMLElement>} parent 
     * @param {Array<{
     * item : string, 
     * icon : leistrap.Leistrap<HTMLElement>,
     * subTitle : string
     * } & string>} data 
     * @param {leistrap.Leistrap<HTMLInputElement>} input 
     * @param {(item)=>void} onSelect 
     * @param {number} limit 
     * @param {boolean} rOnly 
     */
    function autoComplete(parent, input, data, onSelect, rOnly, limit = 10) {


        let timer;
        const container = leistrap.create("div", {
            parent,
            className: "leis-autoComplete"
        });

        let listItem = setListItem();

        input.addEvent('input', async function (event) {
            let text = this._conf.value;


            if (!isEmpty(text)) {
                container.show();
                if (timer) clearTimeout(timer);

                timer = setTimeout(search, 700, text);

            }
            else {
                container.hide();
                if (timer) clearTimeout(timer);

            }
        });

        function search(txtInput, dataSet) {
            listItem.destroy();
            listItem = setListItem();
            let itemFind = false;
            let counterResult = 0;

            for (let x = 0; x < data.length; x++) {
                let item = data[x];
                let txt = isObject(item) ? item.item : item;

                if (has(txtInput.toLocaleLowerCase(), txt.toLocaleLowerCase()) && counterResult <= limit) {
                    leistrap.create("li", { parent: listItem, text: txt, className: "autoItem" })
                        .addEvent("click", function () {
                            input._conf.value = txt;
                            if(onSelect) onSelect(item);
                            container.hide();
                        });
                    itemFind = true;
                    counterResult++;
                }
                if (counterResult == limit) break;
            }


            if (!itemFind) {
                container.hide();
            }
        }

        function setListItem() {
            return leistrap.create("ul", {
                parent: container,
                className: "lis-autoListItem",

            })
        }

        if(rOnly){
            input.addAttr("readonly", "true");
           input.addEvent("click", function(){
            listItem.destroy();
            listItem = setListItem();
            container.show();
            data.forEach(function(item){
                let txt = isObject(item) ? item.item : item;
                leistrap.create("li", { parent: listItem, text: txt, className: "autoItem" })
                .addEvent("click", function () {
                    input._conf.value = txt;
                    if(onSelect) onSelect(item, txt);
                    container.hide();
                });
            });
           });

        }

        input.addEvent("focus", function(){
            container.show();
        });

        input.addEvent("blur", function(e){
            setTimeout(function(){container.hide();}, 600);
        });
        return container
    }

    leistrap.addCss(colorCss);
    leistrap.addCss(leisButton());

    const ColorProp = (function () {

        let  prevColorName = null;
        let prevCOlorValue  = "red";
        const colorEvent = _EventEmitter();
        
        ColorisPicker(function (color) {
            listeners.forEach(item => item(color));
        });
        const listeners = [
            (color, name) => {
                colorView.setStyleSheet({ backgroundColor: color });
                if (name) {
                    leistrap.get("colorValueView", "setText", `${color}  (${name})`);
                    // saveColorBtn.addAttr("disabled", "true")
                }

                else { 
                    leistrap.get("colorValueView", "setText", `${color}`); 
                    saveColorBtn.value = color;
                    // saveColorBtn.removeAttr("disabled")
                }
                if (colorMap.action) colorMap.action(color, name);
            }];

        const colorMap = DropUp();

        const previousColor = setColorBtn(prevCOlorValue, prevColorName);
        previousColor.content[0].removeEvent("click", "clr");
        previousColor.content[0].removeEvent("click", "ch");

        previousColor.content[0].addEvent("click", function(){
            listeners.forEach(item => item(prevCOlorValue, prevColorName));
            crlInput.value = prevCOlorValue;
        });
        leistrap.event.handle("clr-previous:set", function(e, clrV, clrN){
            prevCOlorValue = clrV;
            prevColorName  = clrN;
            previousColor.content[0].setStyleSheet({backgroundColor : clrV});
        });

       const title =  leistrap.create("h3", {text : "Color",parent: colorMap.pop, 
            className : "pop-title leis-flex leis-row"});
        title.add(previousColor).setStyleSheet({paddingBottom : "0"});

        const Header = leistrap.create("div", {className: "pop-header font-header", parent : colorMap.pop});
        const body = leistrap.create("div", {parent : colorMap.pop, className : "pop-body font-body"});
        

        const SearchBar = textBox(Header);
        autoComplete(SearchBar.container, SearchBar.input, Object.keys(colorName),false, false, 8)
        .setStyleSheet({
            top : "45px"
        });
        SearchBar.input.addAttr("placeholder", "Type color name, hex, rgb...");
        SearchBar.input.addEvent("keydown", function(e){
           if( e.keyCode == 13){
                let value = this._conf.value.toLowerCase().trim();

                if(value.startsWith("rgb")){
                    const cv = setColorBtn(value);
                    cv.content[0]._conf.click();
                }
                else if (value.startsWith("#")){
                    const cv = setColorBtn(value);
                    cv.content[0]._conf.click();
                    // cv.destroy()
                }
                else if (value.startsWith("hsl")){
                    const cv = setColorBtn(value);
                    cv.content[0]._conf.click();
                }
                else {
                    if(has(value, colorEvent.eventsList())){
                        colorEvent.invoke(value);
                    }
                }
           }
        });
        
        const tab = leisTab({
            btnParent : Header,
            contentParent : body
        });

        const defaultColor = leistrap.create("div");
        const mayColor = leistrap.create('div', {
            parent: defaultColor,
            className: "col-6",
            style: { columnCount: 6 }

        });

        tab.define('defaultColor', defaultColor, {
            buttonText : "Default color",
            createButton : true
        } ).setClassName("tab-btn-font");

        tab.invoke("defaultColor");
        
        tab.define('myColor', mayColor, {
            buttonText : "My colors",
            createButton : true
        } ).setClassName("tab-btn-font");
        colorMap.pop.setStyleSheet({
            width: "315px",
            overflow : "hidden"
        });

        // display color by names
        const colorNameContent = [];
        loopObject(colorName, function (value, name) {

            let colorValue = `rgb(${value.join(",")})`;
            colorNameContent.push(setColorBtn(colorValue, name.toLowerCase()));
        });

        const colorViewDialog = DropUp(colorMap.pop, ["right", "left", 'bottom', 'top']);
        const colorView = leistrap.create("div", {
            parent: colorViewDialog.pop,
            className: "colorView",
        });


        // color value vew
        leistrap.create("p", {
            data: { id: 'colorValueView' },
            parent: colorViewDialog.pop,
            className: "colorValueView",
        });

        // save color
        const saveColorBtn = leistrap.create("button", {
            text : "Save color",
            className : "leis-btn leis-outline-btn-success",
            parent : colorViewDialog.pop,
            onclick : function(e){
                e.stopImmediatePropagation();
              mayColor.add( setColorBtn(this.value));
              leistrap.event.invoke("color-myColor:save",null, this.value);
            }
        }).setStyleSheet({width : "100%"});
        colorViewDialog.pop.setStyleSheet({
            width: "200px",
            height: "150px",
            padding: "10px",
        });
        const crlInput = document.querySelector(".color-picker");
        crlInput.addEventListener("click", function (e) {
            e.target.exc = [colorViewDialog.pop.key, colorMap.pop.key];
        });

        colorViewDialog.pop.addEvent("click", function (e) {
            
            const clrPicker = document.getElementById("clr-picker");
            clrPicker.leisColor = "true";
            {
                clrPicker.addEventListener("click", function (e) {
                    e.target.exc = [colorViewDialog.pop.key, colorMap.pop.key];
                });
            }
            setPopPosition("absolute", {
                container: colorViewDialog.pop._conf,
                popUp: crlInput,
                popUpRect: clrPicker.getClientRects()[0],
                side: ["top", "bottom", 'fight', 'left']
            });
            crlInput.click();

        });

        leistrap.create("div",
            {
                parent: defaultColor,
                content: colorNameContent,
                className: "col-6",
                style: { columnCount: 6 }

            });

        colorMap.onChange = (listener) => { listeners.push(listener); };
        
        function setColorBtn(colorValue, colorName){

            const button = leistrap.create("button",
                {
                    type: "button",
                    style: { background: colorValue },
                    className: 'color-btn',
                    onclick$clr: () => listeners.forEach(item => item(colorValue, name)),
                    onclick$ch: () => crlInput.value = colorValue
                });
            
            if(colorName){
                colorEvent.handle(colorName, function(){
                    button._conf.click();
                });
                button.addAttr("title", colorName);
            }
            return leistrap.create("div",
                { content: [button], className: "leis-flex color-btn-cd" })
        }

        colorMap.once('hide', function(){
            colorMap.action = colorMap.prevAction || colorMap.action;
            colorMap.children.forEach(function(item){item.hide();});
        });
        colorMap.children.push(colorViewDialog);

        // initial th custom colors save by the user
        leistrap.event.handle("color-myColor:init", function(e, data){
            
            loopObject(data, function(color, name){
                mayColor.add( setColorBtn(color, name));
            });
        });
        return colorMap
    })();

    var sizeCss = "\r\n.sizeUnit-item{\r\n    margin-bottom: 4px;\r\n    padding-left: 4px;\r\n    font-size: 14px;\r\n    \r\n}\r\n.sizeUnit-item.selected::before,\r\n.overflow-item.selected::before{\r\n    content: \"\";\r\n    display: inline-block;\r\n    position: absolute;\r\n    left: 5px;\r\n    top : 13px; \r\n    width: 11px;\r\n    height: 8px;\r\n    border-left: 2px solid  var(--leis-baseColor);\r\n    border-bottom: 2px solid  var(--leis-baseColor);\r\n    transform: rotateZ(-60deg);\r\n\r\n}\r\n\r\n.size-input-cd  label{\r\n    display: inline-block;\r\n    min-width: 70px;\r\n}\r\n.size-input-cd{\r\n font-size: 13px;\r\n justify-content: space-between;\r\n align-content: space-between;\r\n}\r\n\r\n.unitBtn{\r\noutline: none;\r\nborder: var(--leis-border);\r\npadding: 1px 2px;\r\nwidth: 35px;\r\nborder-radius: 50%; \r\ncursor: pointer;\r\nbackground-color: rgba(190, 212, 190, 0.288);\r\nwhite-space: nowrap;\r\noverflow: hidden;\r\ntext-overflow: ellipsis;\r\n\r\n}\r\n.calcInput{\r\n    width: 100%;\r\n    height: 80px;\r\n    resize: none;\r\n    background-color: #ffffff75\r\n}\r\n.size-over-btn{\r\n    width: 45%;\r\n    outline: none;\r\n    border: var(--border);\r\n    padding: 3px 6px;\r\n    border-radius: 5px;\r\n    background-color: rgba(190, 212, 190, 0.288);\r\n    cursor: pointer;\r\n\r\n}\r\n\r\n.size-over-btn:hover{\r\n    background-color: var(--leis-select-cl)\r\n}\r\n\r\n.overflow{\r\n    padding-top: 10px;\r\n    margin-top: 5px;\r\n    border-top: var(--leis-border);\r\n}\r\n.overflow-item{\r\n    padding: 3px 10px;\r\n    padding-left: 24px;\r\n    cursor: pointer;\r\n    border: 1px solid #f6f3f3a3;\r\n    display: flex;\r\n    gap: 10px; \r\n}\r\n\r\n.overflow-item:hover{\r\n    background-color: var(--leis-select-cl);\r\n}";

    let sizeUNIT= ["px", "%", "em", "rem", "ch", "vw", "vh", "svw", "svh"];

    function CssUnit(){

        // size unit
        let sizeUnit = sizeUNIT;
        const defaultUnit = ["auto", "inherit", "initial", "unset", "calc()"];
        sizeUnit = sizeUnit.concat(defaultUnit);

        const calcDrop = DropUp(null, null, null);

        leistrap.create("h4", {
            text: "calc",
            parent: calcDrop.pop,
            className: 'pop-title',
            style : {margin : "0"}
        });
        calcDrop.pop.setStyleSheet({
            width : "250px",
            height : "150px",
            overflow : "hidden",
          
        });

     
        const calcInput = leisTextArea(calcDrop.pop);
        calcInput.input.setClassName("calcInput");

        calcInput.input.addEvent("input", function(){

            if(sizeUnitChooser.input){
                sizeUnitChooser.input._conf.value = "";
                sizeUnitChooser.input.addAttr("disabled", "true");
               }
            const values = this._conf.value.replace(/\n/g, " ")
            .replace(/\+/g, " + ").replace(/\-/g, " - ")
            .replace(/\*/g, " * ").replace(/\//g, " / ");
            const result = `calc(${values})`;
            if(!leistrap.currentElement.unitValue) 
                leistrap.currentElement.unitValue = {};
            leistrap.currentElement.unitValue[sizeUnitChooser.btn.key] = values;
            if (sizeUnitChooser.action) sizeUnitChooser.action(result);

        });
        //color unit chooser
        const sizeUnitChooser = DropUp(null, null, null);
        sizeUnitChooser.pop.setStyleSheet({
            width: '100px',
            height: (sizeUnit.length + (sizeUnit.length * 28)).toString() + "px"
       
        }).addElements(...sizeUnit.map(item => {
           const elem =  leistrap.create('div', {
                text: item.toUpperCase(),
                className: "overflow-item",
                onclick: function () {
                    sizeUnitChooser.pop.content.forEach(item => item.removeClassName("selected"));
                    this.setClassName("selected");
                    if (sizeUnitChooser.action && item != "calc()") sizeUnitChooser.action(item.toLowerCase());
                   },
                style : {fontSize : "14px"}
            }); 
            
            if(item == "calc()"){
                calcDrop.setBtn(elem);
               
                elem.addEvent("click", function(){ 
                    elem.setClassName("selected");
                    calcInput.input._conf.focus();
                   calcInput.input._conf.value = leistrap.currentElement.unitValue[sizeUnitChooser.btn.key] || "";
                   if(leistrap.currentElement.unitValue[sizeUnitChooser.btn.key]){
                     sizeUnitChooser.input._conf.value = "";
                    sizeUnitChooser.action(`calc(${leistrap.currentElement.unitValue[sizeUnitChooser.btn.key]})`);
                   }
                   
                    
                });
            }
            return elem
        }) ).setStyleSheet({ padding: "0" });
       
        
       function useShow(){
         // initialization of the siz unit when the component is opened
         sizeUnitChooser.once("show", function () {

            sizeUnitChooser.unit = sizeUnitChooser.unit || "auto";
            if(sizeUnitChooser.unit.startsWith("calc")){
                 sizeUnitChooser.unit = "calc()";
                 
            }
               

            sizeUnitChooser.pop.content.forEach(item => {
                item.removeClassName("selected");
                if (item.getText().toUpperCase() == sizeUnitChooser.unit.toUpperCase()){
                    item.setClassName("selected");
                    item._conf.click();
                }
            });
        });
       }

       sizeUnitChooser.once("hide", function(){
        calcDrop.hide();
       });

       sizeUnitChooser.once("click", function(){
        calcDrop.hide();
       });

       function setUnit(unit, input, btn){
         
            if(has(unit, sizeUnit)){
                sizeUnitChooser.pop.content.forEach(item => {
                    if(item.getText().toLocaleLowerCase() === unit.toLocaleLowerCase()){
                        item.setText(unit.toUpperCase());
                      if(!has(unit, defaultUnit)) input.removeAttr("disabled");
                    if(btn) {
            
                        btn.setText(unit);
                        btn.selected = item;
                        btn.unit = unit;
                    }
                    }
                    
                });
            }
       }
       sizeUnitChooser.useShow = useShow;
       sizeUnitChooser.setUnit = setUnit;
       sizeUnitChooser.defaultUnit = defaultUnit;


       sizeUnitChooser.btn = function(parent, input, action){
       const unitBtn =  leistrap.create("button", {
            type: "button",
            text: "auto",
            className: 'unitBtn',
            parent,
            onclick: function () {
                sizeUnitChooser.pop.state.visible = false;
                sizeUnitChooser.unit = this.getText();
                sizeUnitChooser.btn = this;
                sizeUnitChooser.input = input;
                calcDrop.hide();

                sizeUnitChooser.action = (unit) => {
                    this.setText(unit);
                    this.unit = unit;
                    
                    // disable the input when he unit is set to auto
                    if (has(unit, defaultUnit)) {
                        input.addAttr("disabled", "true");
                        input._conf.value = "";
                        sizeUnitChooser.hide();
                    }
                    else { 
                        if(!input.state.readonly)input.removeAttr("disabled");
                       
                    }      
                    if(action) action(unit);
                    
                };
            }
        });
        sizeUnitChooser.setBtn(unitBtn);
        return unitBtn
       };

       
       return sizeUnitChooser
       
    }

    function getCSSUnitFromInput(value, sizeUnitChooser, item, unitBtn){
        if (value == "auto"){
            item.input.addAttr("disabled", "true");
        }
        if(value.startsWith("calc")){
            sizeUnitChooser.setUnit("calc()", item.input);
            item.input.addAttr("disabled", "true");
            item.input._conf.value = "";
            unitBtn.setText("calc()");
        }
        else {        
            item.input._conf.value = parseFloat(value);
            let Vc = value.replace(/[\d]/g, "");
            if(Vc == "none"){
                Vc = "auto";
                item.input.addAttr("disabled", "true");
            }
            item.input.unit = Vc;
            sizeUnitChooser.setUnit(Vc, item.input, unitBtn);
        }
    }

    leistrap.addCss(sizeCss);


    const SizeProp = (function () {

        const sizeUnitChooser = CssUnit();
        sizeUnitChooser.useShow();
        //declaration of width, height, min-width, mib-heigh inputs

        const inputs = [
            { lbl: "width", lbl_r: "W", name: "width" },
            { lbl: "height", lbl_r: "H", name: "height" },
            { lbl: "min-width", lbl_r: "MNW", name: "minWidth" },
            { lbl: "min-height", lbl_r: "MNH", name: "minHeight" },
            { lbl: "max-width", lbl_r: "MXW", name: "maxWidth" },
            { lbl: "max-height", lbl_r: "MXH", name: "maxHeight" },
        ];

        function addInput(parent, lbl, name) {
            const item = textBox(parent, lbl);

            item.input.setStyleSheet({
                width: ' 40%'
            }).addAttr("type", "number")
                .addEvent("input", function () {
                    getStyle(name, this._conf.value, unitBtn.getText());

                    leistrap.currentElement.styleData[name] = 
                    this._conf.value +unitBtn.getText();
            
                    StyleEmitter.invoke(name, null,
                    this._conf.value +unitBtn.getText() );

                }).addAttr("disabled", "true");

            item.container.setStyleSheet('flex-direction:  row; align-content: center');

            // add sia unit chooser
            const unitBtn = sizeUnitChooser.btn(item.container, item.input, function(unit){
                getStyle(name, item.input._conf.value, unit);
                leistrap.currentElement.styleData[name] = 
                item.input._conf.value  + unit;
                
                StyleEmitter.invoke(name, null,
               item.input._conf.value +unit  );
            });

            //handles currentElement changed event

            
            StylePropComponentEmitter.handle(name, function(e, value){
               getCSSUnitFromInput(value, sizeUnitChooser, item, unitBtn);
            
            });
        }


        // size container pop up
        const sizeCard = DropUp();
        sizeCard.pop.setClassName("sizeCard");

        leistrap.create("h3", {
            text: "Size",
            parent: sizeCard.pop,
            className: 'pop-title'
        });
        sizeCard.pop.setStyleSheet({
            height: "300px",
            width: " 460px"
        });
        sizeCard.pop.data.id = "sizeUnit-card";

        // listen to click  even of the  sieCard  for  hiding the unitChooser
        sizeCard.once("click", function () {
            sizeUnitChooser.hide();
            overflowDrop.hide();
            overflowValueDrop.hide();
            boxSizeValueDrop.hide();
        });
        sizeCard.once("show", function () {
          if(overflowDrop.selected) overflowDrop.selected._conf.click();
        });


        function getStyle(_prop, value, unit) {
            //  call the  sizeCard action
            let prop = {
                prop: _prop,
                value,
                unit
            };
        
            if ( has( prop.unit, sizeUnitChooser.defaultUnit)) {
                prop.style = {};
                prop.style[prop.prop] = unit;
            }
            else {
        
                prop.style = {};
                prop.style[prop.prop] = prop.value + prop.unit;
            }
            
            if (sizeCard.action) sizeCard.action(prop);
        }

        function getStyleOverflow(prop, value) {
            let cp = prop.toLowerCase().split("-");
            prop = cp[0];
            if (cp.length == 2) prop = cp[0] + cp[1].toUpperCase();

            let propStyle = {
                prop,
                value: value.toLocaleLowerCase(),
                style: {}
            };
            propStyle.style[prop] = propStyle.value;
            leistrap.currentElement.styleData[prop] = value;
      
            
            
            if (sizeCard.action) sizeCard.action(propStyle);
        }

        function getStyleBoxSizing(value) {
            let prop = {
                prop: "boxSizing",
                value,
                style: { boxSizing: value }
            };

            leistrap.currentElement.styleData.boxSizing = value;
            if (sizeCard.action) sizeCard.action(prop);

        }
        // finally  display all inputs
        splitData(inputs, 2).reverse().forEach(item => {

            const inputParent = leistrap.create("div", {
                parent: sizeCard.pop,
                className: "leis-flex leis-row size-input-cd",
            });
            item.forEach(input => addInput(inputParent, input.lbl, input.name));


        });

        // overflow 
        const overflow = ["visible", "hidden", "auto", "scroll", "initial", "inherit", "unset"];

        const overflowBtn = leistrap.create('button', {
            className: "size-over-btn",
            text: "overflow"
        });
        const overflowValue = leistrap.create('button', {
            className: "size-over-btn",
            text: "visible"
        });

        const overflowDrop = DropUp(overflowBtn);
        overflowDrop.pop.setStyleSheet({
            width: "200px",
            height: "100px"
        }).addElements(...["overflow", "overflow-X", "overflow-Y"].map(item =>
            leistrap.create("div", {
                text: capitalize(item),
                className: "overflow-item",
                onclick: function () {
                    if (overflowDrop.selected)
                        overflowDrop.selected.removeClassName("selected");
                    overflowDrop.data = item;
                    
                    const valueOverflow =  leistrap.currentElement.styleData[item.replace("-", "")];
                    getStyleOverflow(overflowDrop.data, valueOverflow);
                    this.setClassName("selected");
                    overflowBtn.setText(item);
                    overflowDrop.selected = this;
                    overflowValueDrop.pop.content.forEach(function(itemJ){
                        itemJ.removeClassName("selected");
                        if(itemJ.getText() == valueOverflow ){
                            itemJ.setClassName("selected");
                            overflowValueDrop.selected = itemJ;
                            itemJ._conf.click();
                        }
                    });
                    
                    
        
                }
            }))).setStyleSheet({ padding: "0" });

        const overflowValueDrop = DropUp(overflowValue);
        overflowValueDrop.pop.setStyleSheet({
            width: "200px",
            height: "230px"
        }).setStyleSheet({ padding: "0" }).addElements(...overflow.map(item => leistrap.create("div", {
            text: item,
            className: "overflow-item",
            onclick: function () {
                if (overflowValueDrop.selected)
                    overflowValueDrop.selected.removeClassName("selected");
                overflowValueDrop.data = item;
                getStyleOverflow(overflowDrop.data, overflowValueDrop.data);
                this.setClassName("selected");
                overflowValue.setText(item);
                overflowValueDrop.selected = this;
            }
        })));

        leistrap.create("div", {
            parent: sizeCard.pop,
            className: "leis-flex leis-row size-input-cd overflow",
            content: [overflowBtn, overflowValue]
        });

        //initial the overflow data
        overflowValueDrop.data = "visible",
        overflowDrop.data = "overflow";

        //box-sizing
        const boxSizing = ["border-box", 'content-box', "inherit", 'initial', "unset"];
        const boxSizeBtn = leistrap.create('button', {
            className: "size-over-btn",
            text: "Box-sizing"
        });
        const boxSizeValue = leistrap.create('button', {
            className: "size-over-btn",
            text: "content-box"
        });

        const boxSizeValueDrop = DropUp(boxSizeValue);
        boxSizeValueDrop.pop.setStyleSheet({
            width: "200px",
            height: "200px"
        }).setStyleSheet({ padding: "0" }).addElements(...boxSizing.map(item => leistrap.create("div", {
            text: item,
            className: "overflow-item",
            onclick: function () {
                if (boxSizeValueDrop.selected)
                    boxSizeValueDrop.selected.removeClassName("selected");
                boxSizeValueDrop.data = item;
                getStyleBoxSizing(boxSizeValueDrop.data);
                this.setClassName("selected");
                boxSizeValue.setText(item);
                boxSizeValueDrop.selected = this;
            }
        })));

        leistrap.create("div", {
            parent: sizeCard.pop,
            className: "leis-flex leis-row size-input-cd overflow",
            content: [boxSizeBtn, boxSizeValue]
        });
        // init the default box-sizing value
        boxSizeValueDrop.data = "content-box";
        
        //listen to the currentElement changed event to get the boxSizing value

        StylePropComponentEmitter.handle("boxSizing", function(e, value){
           boxSizeValueDrop.pop.content.forEach(function(item){
            item.removeClassName("selected");
            if(item.getText() == value){
                // item.setClassName("selected")
                boxSizeValueDrop.selected = item;
                item._conf.click();
            }
           });
            
        });
        return sizeCard
    })();

    var styleCss = "\r\n.font-container .caption{\r\n    cursor: pointer;\r\n    padding: 6px 40px;\r\n    padding-right: 0;\r\n    width: 100%;\r\n    overflow: hidden;\r\n    white-space: nowrap;\r\n    text-overflow: ellipsis;\r\n}\r\n.fontFamily-cd{\r\n    max-height: 0;\r\n    overflow: hidden;\r\n    cursor: pointer;\r\n    transition: 1s ease max-height;\r\n}\r\n\r\n.fontFamily-cd.clicked{\r\n    max-height: 100vh;\r\n}\r\n\r\n.font-item{\r\n    padding: 6px 50px;\r\n    padding-right: 0;\r\n    width: 100%;\r\n    overflow: hidden;\r\n    white-space: nowrap;\r\n    text-overflow: ellipsis;\r\n    \r\n}\r\n\r\n.font-item:hover,\r\n.font-container .caption:hover{\r\n    background-color: var(--leis-select-cl);\r\n}\r\n\r\n.font-container .caption.cd::before{\r\n    position: absolute;\r\n    display: inline-block;\r\n    content: \"\";\r\n    width: 8px;\r\n    height: 8px;\r\n    top: 15px;\r\n    left: 20px;\r\n    font-weight: 500;\r\n    font-size: 16px;\r\n    border-bottom: 2px solid;\r\n    border-left: 2px solid;\r\n    transform: rotateY(180deg) rotateZ(40deg);\r\n    transition: .16s;\r\n}\r\n\r\n.font-container .caption.cd.clicked::before{\r\n        transform: rotateY(180deg) rotateZ(-40deg);\r\n}\r\n\r\n.tab-btn-font{\r\n    padding: 1px 2px;\r\n    cursor: pointer;\r\n    border: none;\r\n    outline: none;\r\n    background-color: inherit;\r\n    font-weight: 450;\r\n}\r\n.tab-btn-font.active{\r\n    font-weight: 500;\r\n    border-bottom: 2px solid var(--leis-baseColor);\r\n}\r\n.font-header .leis-textbox-card{\r\n    margin: 0 !important;\r\n}\r\n\r\n.font-body{\r\n    height: calc(100% - 8rem);\r\n    font-family: serif;\r\n    /* overflow-wrap: ; */\r\n    \r\n}\r\n\r\n.font-container *.selected::after{\r\n    content: \"\";\r\n    display: inline-block;\r\n    position: absolute;\r\n    right: 10px;\r\n    top : 13px; \r\n    width: 11px;\r\n    height: 8px;\r\n    border-left: 2px solid  var(--leis-baseColor);\r\n    border-bottom: 2px solid  var(--leis-baseColor);\r\n    transform: rotateZ(-60deg);\r\n\r\n}\r\n";

    const FontProp = (function(){
      
    leistrap.addCss(styleCss);
    const fontStyle = leistrap.addCss("", true);
    let counter = 0;
    let fontListItems, parentElement;
    let sliceFont = 50;
    let stopValue =  sliceFont;
    let loadTime = 50;

    const webSafeFonts = {
      "Sans-Serif" : [
        "Arial",
        "Verdana",
        "Helvetica",
        "Trebuchet MS",
        "Tahoma",
      ],
      "Serif" : [
        
        "Times New Roman",
        "Georgia",
        "Garamond",

      ],
      "Monospace" : [
         
        "Courier New",
        "Lucida Console",
        "Consolas",
        "Monaco",
        "Comic Sans MS",
      ],

      "Cursive" : [
        "Impact",
      ],
      "System Fonts" : [
        "Segoe UI",
        "Calibri",
        "San Francisco",
        "Lucida Grande",
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;"
      ]
    };

    const downloadedFonts = webSafeFonts;
      
      function setMark(elem){
        if(fontCard.selected)fontCard.selected.removeClassName("selected");
          elem.setClassName("selected");
          fontCard.selected = elem;

      }
      /**
       * 
       * @param {Array<{
       * kind : string,
       * family: string,
       * menu: string,
       * variants : Array<string>,
       * subsets : Array<string>,
       * version : string,
       * lastModified : string,
       * files : {},
       * category : string,
       * }>} fontList
       * @param {leistrap.Leistrap<HTMLElement>} parentElement 
       */
      function getFonts(fontList, parentElement){
        
        if(counter <=  stopValue){
          let fontObject = fontList[counter];
          let variantsList =  Object.keys(fontObject.files);
          let variantsCounter = 0;

          let fontFamilyParent;
          let  fontFa = leistrap.create("div", {className : "fontFamily-cd"});

          let caption = leistrap.create("div", {
            className : "caption cd",
            text : fontObject.family,
            style : {fontFamily : fontObject.family+"regular"},
          });
          let container = leistrap.create("div", { 
            content : [caption, fontFa],
            parent : parentElement,
            className : "font-container",
            onclick : function(){
              fontFa.toggleClassName("clicked"); 
              caption.toggleClassName("clicked");
            }
          });

        
          
          if(variantsList.length == 1) {
            caption.removeClassName("cd");
            fontFamilyParent = container;
            
          }
          else {fontFamilyParent = fontFa;}

          if(variantsCounter <= variantsList.length -1){
            getFontVariants(variantsList[variantsCounter], fontObject, fontFamilyParent,countVariant);
          }

          function countVariant(){
            if(variantsCounter+1 === variantsList.length){
              // all variants are already loaded let continue getting other font
             if(counter+ 1 == stopValue) console.log("all font  loaded");
             else {
              counter++;
              startLoading();
             }
            }
            else
            if(variantsCounter < variantsList.length - 1 ){
              variantsCounter++;
              getFontVariants(variantsList[variantsCounter], fontObject, fontFamilyParent,countVariant);
            }

          }
        }
      }

      /**
       * 
       * @param {{
      * kind : string,
      * family: string,
      * menu: string,
      * variants : Array<string>,
      * subsets : Array<string>,
      * version : string,
      * lastModified : string,
      * files : {},
      * category : string,
      * }} fontObject
      * @param {leistrap.Leistrap<HTMLElement>} parentElement
      * @param {string} variantId  
      */
      function getFontVariants(variantId, fontObject, parentElement, callback){

        let variant = variantId;
          let fontName = fontObject.family.replace(/ /g, "")+variant.replace(/ /g, "");
          fetch(fontObject.files[variant]).then( async function(data){

            const fontBlob =  await data.blob();

           // load all font variant blob object
           const reader = new FileReader();
           reader.onload = function(e){
             
            let  fontLoad =  ` @font-face {font-family:${fontName};src: url(${e.target.result}); }`;
             fontStyle._conf.innerText += fontLoad;
             leistrap.event.invoke("googleFontLoading", null, fontLoad);
           
            if(Object.keys(fontObject.files).length == 1)
              parentElement.addEvent("click", function(){
              const font =  {
                  type : "googleFonts",
                  fontFamily : fontObject.family,
                  fontName, fontBlob, fontUrl:fontObject.files[variant]
                };
              
              if(fontCard.action) fontCard.action(font);
              setMark(parentElement);
              }); 
            
            else {
              leistrap.create("p", {
                text : fontObject.family + " " + variant,
                parent : parentElement,
                style : {fontFamily : fontName},
                className : "font-item",
                onclick : function(e){
                  e.stopPropagation();
                  const font = {
                    fontFamily : fontObject.family,
                    type : "googleFonts",
                    fontName, fontBlob, fontUrl:fontObject.files[variant]
                  }; 
                  if(fontCard.action) fontCard.action(font);
                 setMark(this);
                }
            });

            }

            };
           reader.readAsDataURL(fontBlob);
            callback();
            
          }).catch(function(err){
            console.log('error', err.type);
            
          });
        
      }

      function startLoading(){
        setTimeout(function(){
          getFonts(fontListItems, parentElement);
        }, loadTime);
      }


      function loadWebSafeFonts(parent){
        loopObject(webSafeFonts, function(value, key){

          let  fontFa = leistrap.create("div", {className : "fontFamily-cd"});

          let caption = leistrap.create("div", {
            className : "caption cd",
            text : key,
            style : {fontFamily : choice(value)},
          });
          

          leistrap.create("div", { 
            content : [caption, fontFa],
            parent : parent,
            className : "font-container",
            onclick : function(){
              fontFa.toggleClassName("clicked"); 
              caption.toggleClassName("clicked");
            }
          })._conf.click();

          value.forEach(function(item){
            leistrap.create("p", {
              text :  item,
              parent : fontFa,
              style : {fontFamily : item},
              className : "font-item",
              onclick : function(e){
                e.stopPropagation();
               const font = {
                type : "webSafeFont",
                fontName : item
               };
               if(fontCard.action) fontCard.action(font);
              setMark(this);
              }
          });

          });
        });
      }

      function loadDownloadedFonts(parent){
        loopObject(downloadedFonts, function(value, key){

          let  fontFa = leistrap.create("div", {className : "fontFamily-cd"});
     
          
          let caption = leistrap.create("div", {
            className :  `caption cd`,
            text : key,
            style : {fontFamily : choice(value)},
          });
          
          const container = leistrap.create("div", { 
            content : [caption, fontFa],
            parent : parent,
            className : "font-container",
            onclick : function(){
              fontFa.toggleClassName("clicked"); 
              caption.toggleClassName("clicked");
            }
          });

          if(value.length  == 1){
            caption.setText(value[0]);
            caption.removeClassName("cd");
            caption.setStyleSheet({fontFamily : value[0]});
            caption.addEvent('click', function(){
              const font  = { 
                type : "downloadedFonts",
                fontUrl : null,
                fontPath : null,
                fontName : value[0]
               };
              if(fontCard.action) fontCard.action(font);
              setMark(this);
            });
          }

          else {
            container._conf.click();
            value.forEach(function(item){
              leistrap.create("p", {
                text :  item,
                parent : fontFa,
                style : {fontFamily : item},
                className : "font-item",
                onclick : function(e){
                  e.stopPropagation();
                 const font = { 
                  type : "downloadedFonts",
                  fontUrl : null,
                  fontPath : null,
                  fontName : item
                 };
                if(fontCard.action) fontCard.action(font);
               setMark(this);
                }
            });
      
            });
          }
        });
        
      }

      function continueLoadingFont(){
        if((fontListItems.length - stopValue) < sliceFont)
          sliceFont = fontListItems.length;

        stopValue += sliceFont;
        startLoading();

      }

      //typography component declaration

      const fontCard = DropUp();
      fontCard.pop.setStyleSheet({
        width  : "300px",
        height : "500px"
      });

      leistrap.create("h3", {text : "Font family", parent: fontCard.pop,className : "pop-title"});


      const Header = leistrap.create("div", {className: "pop-header font-header", parent : fontCard.pop});
      const SearchBar = textBox(Header);
      SearchBar.input.addAttr("placeholder", "Search here...");
      const body = leistrap.create("div", {parent : fontCard.pop, className : "pop-body font-body"});
     

      // font tab
      const tab = leisTab({
        btnParent : Header,
        contentParent : body
      });
      
      const webSafeTabCnt = leistrap.create("div");

      const downloadedFontCnt = leistrap.create("div");

      const googleFont = leistrap.create("div", {
        content : [
          leistrap.create("div"),
          leistrap.create("button", {
            text : "View more",
            onclick : continueLoadingFont
          })
        ]
      });

      tab.define('webSafeFont', webSafeTabCnt, {
        buttonText : "Web safe",
        createButton : true
      } ).setClassName("tab-btn-font");

      tab.invoke("webSafeFont");
      
      tab.define('downloadedFonts', downloadedFontCnt, {
        buttonText : "Downloaded",
        createButton : true
      } ).setClassName("tab-btn-font");

      tab.define('googleFonts', googleFont, {
        buttonText : "Search",
        createButton : true
      } ).setClassName("tab-btn-font");

      setTimeout(loadWebSafeFonts, loadTime, webSafeTabCnt);
      setTimeout(loadDownloadedFonts, loadTime, downloadedFontCnt);
      // loadFont(googleFont.content[0])


     
      return fontCard
    })();

    var typoCss = ".aut-fw{\r\n    position: absolute;\r\n    bottom: 1px;\r\n    right: 20px;\r\n    width: 62%;\r\n}\r\n\r\n.fw{\r\n    position: relative;\r\n}\r\n\r\n.fs-b{\r\n    position: absolute;\r\n    right: -10px;\r\n    top: 10ppx;\r\n    font-size: 14px;\r\n}";

    leistrap.addCss(typoCss);
    const typographyProp = (function(){


        const typoCard = DropUp();
        typoCard.pop.setStyleSheet({
            width  : "310px",
            height : "250"
          });

        leistrap.create("h3", {
            text: "Typography",
            parent: typoCard.pop,
            className: 'pop-title'
        });

        const values = ["fontFamily", "fontWeight", "fontSize", "fontStyle", "lineHeight"];
        const fontFamily = textBox(typoCard.pop, "Font-Family");
        const fontWeight = textBox(typoCard.pop, "Font-Weight");
        const fontSize =  textBox(typoCard.pop, "Font-Size");
        const fontStyle = textBox(typoCard.pop, "Font-Style");
        const lineHeight = textBox(typoCard.pop, "Line-Height");

        const allInputs = [fontFamily, fontWeight, fontSize, fontStyle, lineHeight];
        allInputs.forEach(function(item, index){
            item.input.setStyleSheet({width : "60%"});
            item.container.setStyleSheet({flexDirection : "row"});
            item.label.setStyleSheet({
                display: "inline-block",
                minWidth : "70px",
                fontSize : "13px"
            });

          
            // get typography props of the currentElement and then update the typo
            // component's input values
        
          
            StylePropComponentEmitter.handle(values[index], function(event, value){
                item.input._conf.value = has(values[index], ["fontSize", "lineHeight"]) ? parseFloat(value) : value;
                  
                if(values[index] == "fontSize"){            
                    let unit = value.replace(/[0-9,-.]/g, "");      
                    btnUnit.unit = unit;
                   sizeUnitChooser.setUnit(unit, item.input, btnUnit);
                  
                }
              

            });
        });

        FontProp.setBtn(fontFamily.input);
        FontProp.once("show", function(){
            const prevAction = FontProp.action;
            FontProp.action = function(style){
                fontFamily.input._conf.value = style.fontName;
                if(prevAction) prevAction(style);
            };
           
        });

        autoComplete(fontWeight.container, fontWeight.input, 
            rangeList(1000, 0, 100).map(item=> new String(item)),
            function(value){getStyle("fontWeight", value);}, true
        ).setClassName("aut-fw");
        fontWeight.container.setClassName("fw");

        fontWeight.input.addAttr("type", "number");
        typoCard.once("click", function(){
            FontProp.hide();
            sizeUnitChooser.hide();
        });

        typoCard.once("show", function(){
           if(btnUnit.selected) {
            sizeUnitChooser.show();
            btnUnit.selected._conf.click();
            sizeUnitChooser.hide();

           }

        });
        fontWeight.input.addEvent("input", function () {getStyle("fontWeight", this._conf.value);});
        const sizeUnitChooser = CssUnit();

        /**
         * @type {leistrap.Leistrap<HTMLButtonElement>}
         */
        const btnUnit = sizeUnitChooser.btn(fontSize.container, fontSize.input,function(unit){
           getStyle("fontSize", fontSize.input._conf.value+unit);
            
        } );
        btnUnit.setClassName("fs-b");
        fontSize.input.addEvent("input", function(){
            getStyle("fontSize", this._conf.value+btnUnit.unit);
        }).addAttr("type", "number");
       

        autoComplete(fontStyle.container, fontStyle.input, 
           ["italic", "normal", "oblique", "inherit", "initial", "unset"].map(item=> new String(item)),
            function(value){getStyle("fontStyle", value);}, true
        ).setClassName("aut-fw");

        lineHeight.input.addAttr("type", "number");
        lineHeight.input.addEvent("input", function(){
            getStyle("lineHeight", this._conf.value);
        });

        FontProp.action = function({fontName}){
           getStyle("fontFamily", fontName);
         
            
        };
        function getStyle(prop , value){
           
            
            let style = {};
            style[prop]  = value;
            leistrap.currentElement.styleData[prop] = value;
          
            StyleEmitter.invoke(prop, null, value);
            if(typoCard.action) typoCard.action({style});
        }

        return typoCard
    })();

    const SpacingProp = (function(){



        let INPUTS = {
            padding : [],
            margin : [],
            paddingBtns : [],
            marginBtns : [],
            e : []
        };
        const spacingCard = DropUp();
        spacingCard.pop.setStyleSheet({
            width  : "340px",
            height : "250"
          });
        
        spacingCard.once('click', function(){
            sizeUnitChooser.hide();
        });

        leistrap.create("h3", {
            text: "Spacing",
            parent: spacingCard.pop,
            className: 'pop-title',
         
        });

        const Header = leistrap.create("div", {className: "pop-header font-header", parent : spacingCard.pop});
        const body = leistrap.create("div", {parent : spacingCard.pop, className : "pop-body font-body"});

          // font tab
        const tab = leisTab({
            btnParent : Header,
            contentParent : body
        
        });

        const sizeUnitChooser = CssUnit();
        sizeUnitChooser.useShow();

        function setProp(prop){
              // edges
            const edges = [prop, "Top", "Right", "Bottom", "Left"];
            INPUTS.e = edges;
        
            //margin
            let inputElem;
            const container = leistrap.create("div",{
                style : {
                marginTop : "1rem",
                fontFamily : "inherit"
            },
            content : edges.map(function(item, index){
            if(index == 0){
                inputElem =  setInput(null, prop, prop.toLowerCase());
           
            }
             else {
                  inputElem = setInput(null, prop+"-"+item, prop.toLowerCase()+item);
            
             }

            INPUTS[prop.toLowerCase()].push(inputElem.input);
            INPUTS[prop.toLowerCase()+"Btns"].push(inputElem.btnUnit);
            return inputElem.input.container    
            })
            });
            
            
            tab.define(prop, container, {
                buttonText : prop,
                createButton : true
            } ).setClassName("tab-btn-font");

            leistrap.event.handle("spacing-tab:"+ prop.toLowerCase(), function(){
                tab.invoke(prop);
            });

        }

        function setInput(parent, lbl, prop){

            const input = textBox(parent, lbl);

            /**
            * @type {leistrap.Leistrap<HTMLButtonElement>}
            */
            const btnUnit = sizeUnitChooser.btn(input.container, input.input,function(unit){
                getStyle(prop, input.input._conf.value+unit);
                if(has(prop, ["padding", "margin"]))
                    INPUTS[prop+"Btns"].forEach(function(btn){
                        if(btn.unit != unit ){
                            btn.unit = btnUnit;
                            btn.setText(btnUnit.unit);            
                        }
                           
                    });
            
            } );
            btnUnit.setClassName("fs-b");
            btnUnit.setStyleSheet({right : "5px"});
            input.input.addAttr("type", "number");

            input.input.setStyleSheet({width : "50%"});
            input.container.setStyleSheet({flexDirection : "row"});
            input.label.setStyleSheet({
                    display: "inline-block",
                    minWidth : "90px",
                    fontSize : "13px",
                    fontFamily : "inherit"
            });
            input.input.addEvent("input", function () {
                let value = this._conf.value;
                
                if(has(prop, ["padding", "margin"])){
                    INPUTS[prop].forEach(function(item, index){
                        item.input._conf.value = value;

                        if(index == 0) 
                            getStyle(prop, value+btnUnit.unit);
                        else {
                            getStyle(prop+INPUTS.e[index], value+btnUnit.unit);
                        } 
                        
                    });

                    INPUTS[prop+"Btns"].forEach(function(btn){
                        if(btn.unit != btnUnit.unit){
                            btn.unit = btnUnit;
                            btn.setText(btnUnit.unit);            
                        }
                           
                    });
                }
                else
               { getStyle(prop, value+btnUnit.unit);}
            }
            );
       
            
            StylePropComponentEmitter.handle(prop, function(e, value){
                
                const MPV = value.split(" ");
                if(MPV.length == 1){
                   
                    let unit = value.replace(/[0-9,-.]/g, ""); 
                    input.input._conf.value = parseFloat(value);
                    btnUnit.unit = unit;
                    sizeUnitChooser.setUnit(unit, input.input, btnUnit);
                }
                
            });
            return {input, btnUnit}
        }
        

        function getStyle(prop , value){
            let style = {};
            style[prop]  = value;
            leistrap.currentElement.styleData[prop] = value;
            if(spacingCard.action) spacingCard.action({style});

        }

        setProp("Margin");
        setProp("Padding");
        tab.invoke('Margin');
        return spacingCard
    })();

    const BorderProp = (function(){

       
        const event = _EventEmitter();

        let BORDER = "border";
        const borderCard = DropUp();
        const sizeUnitChooser = CssUnit();
        sizeUnitChooser.useShow();

       borderCard.once("click", function(){
            sizeUnitChooser.hide();
            ColorProp.hide();
        }); 

        borderCard.once("hide", function(){
           resetRadius();
        }); 

        borderCard.once("show", function(){
            event.invoke(leistrap.currentElement.styleData.lsBorder || "border");
        }); 

        borderCard.pop.setStyleSheet({
            width : "300px",
            height : "400px"
        });
        
        leistrap.create("h3", {
            text: "Spacing",
            parent: borderCard.pop,
            className: 'pop-title'
        });

        const left = leistrap.create('div', {
            style : {
                width : "40%"
            }
        });
        const right = leistrap.create('div', {
            style : {
                borderLeft : "var(--leis-border)",
                paddingLeft : "10px",
                width : "60%",
            }
        });

        const bottom = leistrap.create("div",{
            style : {
                paddingTop: "1rem",
                borderTop : "var(--leis-border)"
            }
        });

        leistrap.create("div", {
            className : "leis-flex leis-row",
            content : [left, right],
            parent : borderCard.pop
        }).content.forEach(function(item){
            item.setStyleSheet({
                height : "130px",
                flexDirection : "row"
            });
        });
        borderCard.pop.add(bottom);

        const borderValues = ["Border", "Top", "Left", "Right", "Bottom"];
        let id  = generateId(2, 3);

        borderValues.forEach(function(item, index){
            const input = btnRadio(left, item, active);
            input.input.addAttr('name', id);
            let propName = item == "Border" ? "border" : "border"+item;
            input.input.value =  propName;

            input.container.setStyleSheet({
                flexDirection : "row-reverse"
            });
            
            event.handle(propName, function(e){
                input.input._conf.click();
            });

            StylePropComponentEmitter.handle(propName, function(e, value){
                // console.log(propName, value);
                
            });
            
        });

        const borderStyle = ['solid', "dashed","dotted", "double", "groove", "hidden", "inherit",
            "initial", "inset", "none", "outset", "ridge", "unset"
        ];

        const bdW = textBox(right, "Width");
        const bdS = textBox(right, "Style");
        const bdC = textBox(right, "Color"); 
        const radius = textBox(bottom, "Radius");
        const radiusLeft = textBox(bottom, "Left");
        const radiusRight = textBox(bottom, "Right");
        
        autoComplete(bdS.container, bdS.input, borderStyle,
            function(value){getBorder("style", value);}
        ).setClassName("aut-fw");
        bdW.input.addEvent("input", function(){
            getBorder("width", this._conf.value+this.unit);
           
        });

        bdW.input.addAttr('type', "number");
        bdC.input.setStyleSheet({background: "red"});
        const radius_ = [radius, radiusLeft, radiusRight];

        radius_.forEach(function(item, index){
            item.container.setStyleSheet({
                flexDirection : "row"
            });
            item.input.setStyleSheet({
                width : "60%"
            }).addAttr("type", "number");
            item.label.setStyleSheet({
                fontSize : "14px",
                minWidth : "40px"
            });

           item.btn = sizeUnitChooser.btn(item.container, item.input, function(unit){
                item.input.unit = unit; 
                getRadius(item.input._conf.value+unit, index);
            }).setStyleSheet({
                fontSize : '13px'
            });

            item.input.addEvent("input", function(){
                if(BORDER) getRadius(this._conf.value+this.unit || 'px' , index);
            });
        });

        let bdWB = sizeUnitChooser.btn(bdW.container, bdW.input, function(unit){
            bdW.input.unit = unit;
            getBorder("width",  bdW.input._conf.value + unit);
            
        }).setStyleSheet({
            fontSize : "14px",
            position : "absolute",
            right : "-13px",
            top : "-2px"
        });
        const inputs = [bdS, bdW, bdC];

        inputs.forEach(function(item){
            item.container.setStyleSheet({
                flexDirection : "row"
            });
            item.input.setStyleSheet({
                width : "50%"
            });
            item.label.setStyleSheet({
                fontSize : "14px",
                minWidth : "40px"
            });

        });

        ColorProp.setBtn(bdC.input);
        bdC.input.popInstance = true;
        
        bdC.input.addEvent("click", function(){
            ColorProp.prevAction = ColorProp.action;
            ColorProp.action = function(value){
                bdC.input.setStyleSheet({background: value});
                getBorder("color", value);
            };
        });

        function updateCompInputs(propValue){
            const values = propValue.trim().replace(/, +/gi, ",").split(" "); 
            getCSSUnitFromInput(values[0], sizeUnitChooser, bdW, bdWB );
            bdS.input._conf.value = values[1] == "none" ? "solid": values[1];
            bdC.input.setStyleSheet({background: values[2]});
            leistrap.event.invoke("clr-previous:set", null,values[2] );
            
        }

        function resetRadius(){
            let r = [radius, radiusLeft, radiusRight];
            r.forEach(function(item){
                item.input._conf.value = "";
                item.btn.setText("auto");
            });
        }
        /**
         * @this {leistrap.Leistrap<HTMLElement>}
         */
        function active(){
          
            leistrap.currentElement.styleData.lsBorder = this.value;
            BORDER = this.value; 
            updateCompInputs(leistrap.currentElement.styleData[this.value]);
           
           const inputs = [radiusLeft, radiusRight, radius];
            
           inputs.forEach(function(item){
            item.input.removeAttr("disabled");
            item.input.state.readonly = false;
           });


           if(has(this.value.toLowerCase(), ["bordertop", "borderbottom"])){
            resetRadius();
            radius.input.addAttr("disabled", "true").state.readonly = true;
            getCSSUnitFromInput(leistrap.currentElement.styleData[this.value+"LeftRadius"], sizeUnitChooser, radiusLeft, radiusLeft.btn);
            getCSSUnitFromInput(leistrap.currentElement.styleData[this.value+"RightRadius"], sizeUnitChooser, radiusRight, radiusRight.btn);
           }
          
           if(has(this.value.toLowerCase(), ["border"])){
            resetRadius();
            radiusLeft.input.addAttr("disabled", "true").state.readonly = true;
            radiusRight.input.addAttr("disabled", "true").state.readonly = true;
            getCSSUnitFromInput(leistrap.currentElement.styleData.borderRadius, sizeUnitChooser, radius, radius.btn);
            
           }
        
           if(has(this.value.toLowerCase(), ["borderleft", "borderright"])){
                inputs.forEach(function(item){
                    item.input.addAttr("disabled", "true");
                    item.input.state.readonly = true;
                });
                resetRadius();
           }
        
        }

        function getStyle(prop_, value){

            if(value){
                const style = {};
                style[prop_] = value;      
                leistrap.currentElement.styleData[prop_] = value;
                if(borderCard.action) borderCard.action(style);
            }
            
           
        }

        function getRadius(value,  index){
            if(index == 0){
                let v = ["borderTop", "borderBottom"];
                v.forEach(function(item){
                    leistrap.currentElement.styleData[item+"LeftRadius"] = value;
                    leistrap.currentElement.styleData[item+"RightRadius"] = value;
                });
            }
            getStyle(BORDER+['Radius', "LeftRadius", "RightRadius"] [index], value );
        }
        function getBorder(bdProp, value){

            let propValue = leistrap.currentElement.styleData[BORDER];
            
            const values = propValue.trim().replace(/, +/gi, ",").split(" ");
            if(bdProp == "width") values[0] = value;
            if(bdProp == "style") values[1] = value;
            if(bdProp == "color") values[2] = value;
            if(values[1] == "none") values[1] = "solid";
            getStyle(BORDER, values.join(" "));
        
            
        }

        return borderCard
    })();

    const alignSelf = [
        "auto", 
        "stretch", 
        "flex-start", 
        "flex-end", 
        "center", 
        "baseline"
    ];

    const displayValues = [
        "block",
        "inline",
        "inline-block",
        "flex",
        "inline-flex",
        "grid",
        "inline-grid",
        "flow-root",
        "none",
        "contents",
        "table",
        "table-row",
        "table-cell",
        "table-column",
        "table-column-group",
        "table-row-group",
        "table-header-group",
        "table-footer-group",
        "table-caption",
        "ruby",
        "ruby-base",
        "ruby-text",
        "ruby-base-container",
        "ruby-text-container",
        "list-item",
        "inline-list-item"
      ];

      const flexBoxProperties = {
        "parent" : {
            "flex-direction": ["row", "row-reverse", "column", "column-reverse"],
            "flex-wrap": ["nowrap", "wrap", "wrap-reverse"],
            "justify-content": [
            "flex-start", 
            "flex-end", 
            "center", 
            "space-between", 
            "space-around", 
            "space-evenly"
            ],
            "align-items": alignSelf,
            "align-content": [
                "stretch", 
                "flex-start", 
                "flex-end", 
                "center", 
                "space-between", 
                "space-around"
            ],
            "gap": ["<length>", "normal"], // Exemple : "10px", "1rem"
            "row-gap": ["<length>", "normal"], // Exemple : "15px", "2em"
            "column-gap": ["<length>", "normal"], // Exemple : "5px", "1em"
        },
      

       "child" : {
            "order": ["<integer>"], // Exemple : -1, 0, 1, 2
            "flex-grow": ["<number>"], // Exemple : 0, 1, 2
            "flex-shrink": ["<number>"], // Exemple : 0, 1, 2
            "flex-basis": ["<length>",], // Exemple : "auto", "100px", "30%"
            "flex": ["<string>", "none", "<flex-grow> <flex-shrink> <flex-basis>"], // Exemple : "1 1 auto"
            "align-self": alignSelf
       }
      };


      const gridParentProperties = {

        "grid-template-rows": ["none", "<track-list>", "subgrid"], // Exemple : "100px 1fr auto"
        "grid-template-columns": ["none", "<track-list>", "subgrid"], // Exemple : "repeat(3, 1fr)"
        "grid-template-areas": ["none", "<string>"], // Exemple : `"header header" "sidebar content"`
        "grid-template": ["<grid-template-rows> / <grid-template-columns>"], // Exemple : "100px auto / 1fr 2fr"
        "grid-auto-rows": ["auto", "<track-size>"], // Exemple : "minmax(100px, auto)"
        "grid-auto-columns": ["auto", "<track-size>"], // Exemple : "minmax(50px, 1fr)"
        "grid-auto-flow": ["row", "column", "dense", "row dense", "column dense"],
        "gap": ["<length>", "normal"], // Exemple : "10px", "1rem"
        "row-gap": ["<length>", "normal"], // Exemple : "15px", "2em"
        "column-gap": ["<length>", "normal"], // Exemple : "5px", "1em",
        "align-content": [
          "start", 
          "end", 
          "center", 
          "stretch", 
          "space-between", 
          "space-around", 
          "space-evenly"
        ],
        "justify-content": [
          "start", 
          "end", 
          "center", 
          "stretch", 
          "space-between", 
          "space-around", 
          "space-evenly"
        ],
        "align-items": ["start", "end", "center", "stretch"],
        "justify-items": ["start", "end", "center", "stretch"]
      };
      
      const gridChildProperties = {
        "grid-column": ["auto", "<start-line> / <end-line>"], // Exemple : "1 / 3", "span 2"
        "grid-row": ["auto", "<start-line> / <end-line>"], // Exemple : "1 / 4", "span 3"
        "grid-column-start": ["auto", "<line>"], // Exemple : "1", "span 2"
        "grid-column-end": ["auto", "<line>"], // Exemple : "3", "span 2"
        "grid-row-start": ["auto", "<line>"], // Exemple : "1", "span 3"
        "grid-row-end": ["auto", "<line>"], // Exemple : "4", "span 3"
        "grid-area": ["auto", "<name>", "<row-start> / <column-start> / <row-end> / <column-end>"], // Exemple : "1 / 2 / 3 / 4"
        "justify-self": ["start", "end", "center", "stretch"],
        "align-self": ["start", "end", "center", "stretch"],
        "place-self": ["<align-self> <justify-self>"] // Exemple : "center start"
      };
      

      const CSS_PROPS = [
        "overflow",
        "overflowX",
        "overflowY",
        "borderTopLeftRadius",
        "borderTopRightRadius",
        "borderBottomRightRadius",
        "borderBottomLeftRadius",

      ];

      let MenuRect = {
        x : 50,
        y: 60
      };

    const LayoutProp = (function(){
       
        const event = _EventEmitter();
        const room = [];
        const layoutCard = DropUp();
        const sizeUnitChooser = CssUnit();
        sizeUnitChooser.useShow();
        layoutCard.once("click", function(){
            sizeUnitChooser.hide();
        });

        layoutCard.pop.setStyleSheet({
            width  : "400px",
            height : "90vh"
          });

        layoutCard.once("show", function(){
            if(leistrap.currentElement){
                const ev = leistrap.currentElement.styleData.display || "";
                event.invoke(ev.toLocaleLowerCase().replaceAll("-", ""));

            }
        });
        leistrap.create("h3", {
            text: "Layout",
            parent: layoutCard.pop,
            className: 'pop-title'
        });
        const Header = leistrap.create("div", {className: "pop-header font-header", parent : layoutCard.pop,
            style : {marginBottom : "1rem"}
        });
        const body = leistrap.create("div", {parent : layoutCard.pop, className : "pop-body font-body"});

        const tab = leisTab({
            btnParent : Header,
            contentParent : body
        });


        const staticKLayoutContainer = leistrap.create("div", 
            {
                className : "leis-autoComplete",
            }
        );
        const listSTLO = leistrap.create("ul", {
            className : "lis-autoListItem",
            parent : staticKLayoutContainer,
            style : {border : "none"}
        });

        displayValues.forEach(function(item){

            const RDB = btnRadio(null, item, function(){
                getStyle("display", item);
                StyleEmitter.invoke("display", null, item);
                room.forEach(function(r){
                    r(item);
                });
                
                
            });

            event.handle(item.toLocaleLowerCase().replaceAll("-", ""), function(){
                RDB.input._conf.click();
            });

            RDB.container.setStyleSheet({
                justifyContent: 'space-between',
                width : "100%",
                flexDirection : "row-reverse",
                paddingRight : "10px",
                cursor : "pointer",
            }).setClassName("leis-flex leis-row");
            
            RDB.label.setStyleSheet({
                width : "90%",
                display : "flex",
                justifyContent : "end",
                
            });
            RDB.input.addAttr("name", "st-name");

            leistrap.create("li", {
                className : "autoItem",
                parent : listSTLO,
                content : [RDB.container]
            });
        });

        tab.define('static-layout', staticKLayoutContainer, {
            buttonText : "Display",
            createButton : true
        } ).setClassName("tab-btn-font");

        

        function setLayout(txt, tabName, tabLbl, layout, disCases){
            const flexContainer = leistrap.create("div");
            const flexParent = leistrap.create("div", {parent: flexContainer, style: {paddingRight: "10px"}});
            flexContainer.add(leistrap.create("h3", {text : txt}));
            const flexElement = leistrap.create("div", {parent: flexContainer,style: {paddingRight: "10px"}});

            loopObject(layout.parent, function(value, key){
                setFlexParentChildProp(flexParent, value, key);
            } );
            
            loopObject(layout.child, function(value, key){
                setFlexParentChildProp(flexElement, value, key);
            } );

            tab.define(tabName, flexContainer, {
                buttonText : tabLbl,
                createButton : true
            } ).setClassName("tab-btn-font");

            
            room.push(
                function(valueSelected){
                    flexParent.addAttr({
                        hidden : "true"
                    });
                    if(has(valueSelected, disCases)){
                        flexParent.removeAttr("hidden");
                    }
                }
            );
            disCases.forEach(function(ite){
                leistrap.event.handle("layout-show:"+ite, function(e){
                    tab.invoke(tabName);
                } );
            });
        }

        function setFlexParentChildProp(parent, value, key){

            let lbl = key.split("-");

            if(lbl.length > 2){
                lbl = lbl.slice( lbl.length - 2).join("-");
            }
            else {
                lbl = key;
            }
            const elem = textBox(parent, lbl);
            elem.input.setStyleSheet({width : "60%"});
            elem.container.setStyleSheet({
                flexDirection : "row",
                justifyContent : "space-between"
            }).setClassName("leis-flex leis-column");
           

            if(value[0] == "<length>"){
                elem.input.addAttr("type", "number").setStyleSheet({
                    width : "45%"
                });
                elem.label.setStyleSheet({
                    minWidth : "35%"
                });
                const unitBtn = sizeUnitChooser.btn(elem.container, elem.input, function(unit){
                    onSelectOption(null, elem.input._conf.value + unit);
                });
                elem.input.addEvent("input", function(){
                    onSelectOption(null, this._conf.value+unitBtn.unit);
                });

                StylePropComponentEmitter.handle(toCamelKey(key), function(e, data){
                    getCSSUnitFromInput(data, sizeUnitChooser, elem, unitBtn);
                });  
            }
            
            else if (has(value[0], ["<integer>", "<number>"])){
                elem.input.addAttr("type", "number");
                elem.input.addEvent("input", function(){
                    onSelectOption(null, this._conf.value);
                });
            }
            else if(value[0] == "<string>"){
                
                elem.input.addAttr("type", "text");
            }
            else {
              
                
                autoComplete(elem.container, elem.input, 
                    value,
                     onSelectOption,
                     true
                 ).setClassName("aut-fw").setStyleSheet({
                     right : "0"
                 });
                   
               
            }


            function onSelectOption(data, txt){
                
           
                getStyle(toCamelKey(key), txt );
               
                
            }

            if(value[0] != "<length>"){
               
                
                StylePropComponentEmitter.handle(toCamelKey(key), function(e, data){
                    elem.input.addAttr("value", data);
                    
              
                    
                    
                });  
            }

        }


        function getStyle(prop, value){       
            const style = {};
            style[prop] = value;
            leistrap.currentElement.styleData[prop] = value;
            if(layoutCard.action) layoutCard.action(style);
        }

        setLayout("Flex element",  "flex",  "Flex box", flexBoxProperties,
            ["flex", "inline-flex"]
        );

        setLayout("Grid element",  "grid",  "Grid box", {
            parent : gridParentProperties,
            child : gridChildProperties
            },
            ["grid", "inline-grid"]
        );
        tab.invoke("static-layout");
        leistrap.event.handle("layout-show", function(){
            tab.invoke("static-layout");
        });
        return layoutCard

    })();

    const PositionProp = (function(){

        const PosCard = DropUp();
        PosCard.pop.setStyleSheet({
            width  : "310px",
            height : "250"
          });
        
        leistrap.create("h3", {
            text: "Position",
            parent: PosCard.pop,
            className: 'pop-title'
        });
        PosCard.once("click", function(){
            sizeUnitChooser.hide();
        });

        const sizeUnitChooser = CssUnit();
        sizeUnitChooser.useShow();
        
        let posValues =  ["static", "sticky", "absolute", "relative", "fixed"];
        let posSide = ["top", "bottom", "right", "left"]; 

        // position
        const position = setInput(PosCard.pop, "Position");
        autoComplete(position.container,  position.input, posValues.sort(), function(value){
            getStyle("position", value);
            StyleEmitter.invoke("position", null, value);
        }, true);

        StylePropComponentEmitter.handle("position", function(e, value){      
           position.input._conf.value = value;
                
        });

        posSide.forEach(function(item){
            let elem = setInput(PosCard.pop, item);
            elem.input.addAttr("type", "number").addEvent("input", function(){
                getStyle(item, this._conf.value+btnUnit.unit);
                
            });        

             /**
             * @type {leistrap.Leistrap<HTMLButtonElement>}
             */
            const btnUnit = sizeUnitChooser.btn(elem.container, elem.input,function(unit){
                getStyle(item, elem.input._conf.value+unit);
                
            } ).setClassName("fs-b");
        
            StylePropComponentEmitter.handle(item, function(e, value){      
                getCSSUnitFromInput(value, sizeUnitChooser, elem, btnUnit);
                    
            });

        });

        // add zIndex
        const zIndex = setInput(PosCard.pop, "Z-index");
        zIndex.input.addAttr("type", "number").addEvent("input", function(){
            getStyle("zIndex", this._conf.value);
        });
        StylePropComponentEmitter.handle("zIndex", function(e, value){      
            zIndex.input._conf.value = value == "auto" ? "0" : value;
            
                
        });

        function setInput(parent, lbl){
            let elem = textBox(parent, lbl);
            elem.input.setStyleSheet({width : "60%"});
            elem.container.setStyleSheet({flexDirection : "row"});
            elem.label.setStyleSheet({
                display: "inline-block",
                minWidth : "70px",
                fontSize : "13px"
            });
            return elem
        }
        function getStyle(prop, value){
            let style = {};
            style[prop] = value;
            leistrap.currentElement.styleData[prop] = value;
            if(PosCard.action) PosCard.action(style);
        }

        return PosCard
    })();

    var curCss = ".curItem{\r\n    padding: 4px 20px;\r\n    padding-right:0 ;\r\n    cursor: pointer;\r\n}\r\n\r\n.curItem:hover{\r\n    background-color: var(--leis-select-cl);\r\n    \r\n}\r\n\r\n.curItem i{\r\n    font-size: 19px;\r\n    min-width: 25px;\r\n}\r\n\r\n.curItem span{\r\n    font-size: 15px;\r\n}\r\n\r\n.curItem.selected{\r\n    background-color: rgba(221, 221, 230, 0.363);\r\n}\r\n.curItem.selected::after{\r\n    content: \"\";\r\n    display: inline-block;\r\n    position: absolute;\r\n    right: 8px;\r\n    top : 14px; \r\n    width: 15px;\r\n    height: 10px;\r\n    border-left: 2px solid  var(--leis-baseColor);\r\n    border-bottom: 2px solid  var(--leis-baseColor);\r\n    transform: rotateZ(-60deg);\r\n\r\n}\r\n";

    leistrap.addCss(curCss);
    const cursorIcons = {
        "auto": "arrow-down-up",         // Automatique, basé sur le contexte
        "default": "cursor",            // Curseur par défaut
        "none": "slash-circle",         // Aucun curseur
        "context-menu": "menu-app",     // Menu contextuel
        "help": "question-circle",      // Aide
        "pointer": "hand-index",        // Main (pointer)
        "progress": "hourglass-split",  // Progression en cours
        "wait": "hourglass",            // Attente
        "cell": "grid",                 // Sélection de cellule
        "crosshair": "crosshair",       // Ligne de visée
        "text": "type",                 // Texte sélectionnable
        "vertical-text": "text-paragraph", // Texte vertical
        "alias": "box-arrow-up-right",  // Alias ou raccourci
        "copy": "clipboard",            // Copier
        "move": "arrows-move",          // Déplacement
        "no-drop": "hand-thumbs-down",  // Zone où le déplacement est interdit
        "not-allowed": "x-circle",      // Action non autorisée
        "grab": "hand",                 // Prendre
        "grabbing": "hand-thumbs-up",   // En train de saisir
        "all-scroll": "arrows-collapse", // Déplacement dans toutes les directions
        "col-resize": "arrows-expand",  // Redimensionnement horizontal
        "row-resize": "arrows-expand",  // Redimensionnement vertical
        "n-resize": "arrow-up",         // Redimensionnement vers le nord
        "e-resize": "arrow-right",      // Redimensionnement vers l'est
        "s-resize": "arrow-down",       // Redimensionnement vers le sud
        "w-resize": "arrow-left",       // Redimensionnement vers l'ouest
        "ne-resize": "arrow-up-right",  // Redimensionnement vers le nord-est
        "nw-resize": "arrow-up-left",   // Redimensionnement vers le nord-ouest
        "se-resize": "arrow-down-right",// Redimensionnement vers le sud-est
        "sw-resize": "arrow-down-left", // Redimensionnement vers le sud-ouest
        "ew-resize": "arrows-expand",   // Redimensionnement est-ouest
        "ns-resize": "arrows-expand",   // Redimensionnement nord-sud
        "nesw-resize": "arrows-diagonal", // Redimensionnement en diagonale
        "nwse-resize": "arrows-diagonal", // Redimensionnement en diagonale opposée
        "zoom-in": "zoom-in",           // Zoom avant
        "zoom-out": "zoom-out"          // Zoom arrière
      };
      



    const CursorProp = (function(){


        let prevSelected = null;
        const cursorPop = DropUp(null, null, null);
        cursorPop.pop.setStyleSheet({
            width: '170px',
            height: "90vh",
            padding : "0"
       
        })
        .addElements(...Object.keys(cursorIcons).map(function(cur){

            const elem =  leistrap.create('div', {
                className: "leis-flex leis-row curItem",
                onclick: function () {
                    if(prevSelected){
                        prevSelected .removeClassName("selected");
                    }
                    this.setClassName("selected");
                    prevSelected = this;
                    if(cursorPop.action) cursorPop.action(cur);
                },
                
                content : [
                    leistrap.create("i", {className: `bi bi-${cursorIcons[cur]}`}),
                    leistrap.create("span", {text : cur})
                ],

            }); 
            return elem
        }));
          
        return cursorPop

    })();

    /**
     * this file contains all configurations of all styling components
     * ths  `propEmitter` event emitter contains all event channels of the styling components
     * to triggle or call a given component e.i color for color prop you have to use the interface 
     * @example 
     *  propEmitter.invoke("color")
     * 
     * NOte : the `propEmitter.invoke`, this method invoke the color picker component an d then 
     * displays this one into the page where a user can drag over the color hue to select a specific color
     * and update the `color` prop of the `leistrap.currentElement`.
     * 
     * 1. the leistrap.currentElement` is a global prop of the leistrap object that contains the current focused or 
     * just clicked element.
     * all component respect this structure.
     * 
     */
    const  configProp = (function(){


        /**
         * the eventEmitter for all components. each component will listen to a specific event channel
         * via `propEmitter.handel` method and the waiting for a an event invoke or emit  to display the
         * component  into the page where  a use easily use and update a specific CSS prop of the 
         * `leistrap.currentElement`.
         */
        const propEmitter = _EventEmitter();
      

        /**
         * this event channel `color` listen for an invoke of `color` (eventEmitter.invoke("color")) to 
         * display th color picker component (ColorProp).
         * 
         * Note : `ColorProp` is a component which contains the colorPicker hue and listen to the user 
         * dragging event into the spectra via the `ColorProp.action ` method then update  the color CSS prop  of 
         * the `leistrap.currentElement`
         * 
         * all below component or propEmitter.handle event respect this structure
         */
        propEmitter.handle('color', function(event){
            ColorProp.action = function(color){
                leistrap.currentElement.setStyleSheet({color});
                StyleEmitter.invoke("color",null,  color);
                leistrap.currentElement.styleData.color = color;
                getCurStyle({color});
           
               
            };
        });
        


        //backgroundColor via the   ColorProp component
        propEmitter.handle('backgroundColor', function(event){
            ColorProp.action = function(color){
                let bg = {backgroundColor : color};
                leistrap.currentElement.setStyleSheet(bg);
                StyleEmitter.invoke("backgroundColor",null,  color);
                leistrap.currentElement.styleData.backgroundColor = color;
                getCurStyle( bg);
            };
        });
      

        /**
         * ths Size event channel can change the leistrap.current
         */
        propEmitter.handle("size", function(e){
            SizeProp.action = function({style}){
                leistrap.currentElement.setStyleSheet(style);
                getCurStyle(style);
            };
        });
        


        //typography
        propEmitter.handle("typography", function(e){
           typographyProp.action = function({style}){
            leistrap.currentElement.setStyleSheet(style);
            getCurStyle(style);

           };
        });


        //spacing
        propEmitter.handle("spacing", function(e){
            SpacingProp.action = function({style}){
                leistrap.currentElement.setStyleSheet(style);
                getCurStyle(style);
            };
         });
        
         
        
            //border
        propEmitter.handle("border", function(e){
            BorderProp.action = function(style){
                leistrap.currentElement.setStyleSheet(style);
                getCurStyle(style);

            
            };
         });
      
        
         //layout
        propEmitter.handle("layout", function(e){
            LayoutProp.action = function(style){
                leistrap.currentElement.setStyleSheet(style);
                getCurStyle(style);

            };
         });

          //Position
        propEmitter.handle("position", function(e){
            PositionProp.action = function(style){
                leistrap.currentElement.setStyleSheet(style);
                getCurStyle(style);

            };
         });

        //cursor
        propEmitter.handle("cursor", function(e){
            CursorProp.action = function(style){
                // leistrap.currentElement.setStyleSheet(style)
                // getCurStyle(style)
                console.log(style);
                

            };
         });
        
        setShortCuts(null, window);
        function setShortCuts (ev, win){
            set_(win,"s+c", "color", ColorProp, function(){leistrap.event.invoke("colors:color");} );
            set_(win,"s+b", "backgroundColor", ColorProp, function(){leistrap.event.invoke("colors:bg");} );
            set_(win,"s+i", "size", SizeProp );
            set_(win,"s+t", "typography", typographyProp );
            set_(win,"s+p", "spacing", SpacingProp );
            set_(win,"s+o", "border", BorderProp );
            set_(win,"s+l", "layout", LayoutProp );
            set_(win,"s+y", "position", PositionProp );
            set_(win,"s+u", "cursor", CursorProp );

        }

        function set_(win, sh, compCh, comp, listener){
            win.bind(sh, function(){
                 leistrap.event.invoke("hidepopup", null, comp.pop.key);
                propEmitter.invoke(compCh);
                comp.show();
                if(listener) listener();
            });
        }
       
       
        leistrap.event.handle("setSH-SP",setShortCuts );
        
        function getCurStyle(style){
            leistrap.event.invoke("page-style:changed", null, style);
        }
        return {
            propEmitter,
            StyleEmitter
        }



    })();

    var menuCss = ".ls-m-i{\r\n    padding: 6px 10px;\r\n    padding-right: 25px;\r\n    cursor: pointer;\r\n    gap: 10px;\r\n    margin: 0;\r\n    justify-content: space-between;\r\n}\r\n\r\n.ls-m-i:hover{\r\n    background-color: var(--leis-select-cl);\r\n}\r\n.ls-ls-m{\r\n    list-style: none;\r\n    list-style-position: unset;\r\n    overflow: hidden;\r\n    height: 100%;\r\n}\r\n.leis-menu{\r\n    width: 100%;\r\n    padding: 8px 0;\r\n    margin: 0;\r\n}\r\n\r\n.ls-i-0,\r\n.ls-i-1,\r\n.ls-i-2{\r\n    overflow: hidden;\r\n    white-space: nowrap;\r\n    text-overflow: ellipsis;\r\n    font-weight: 400;\r\n}\r\n\r\n.ls-i-0{\r\n    width: 10%;\r\n}\r\n.ls-i-1{\r\n    width: 55%;\r\n\r\n}\r\n.ls-i-2{\r\n    width: 35%;\r\n    display: flex;\r\n    justify-content: end;\r\n    color: #474646;\r\n\r\n}\r\n.nI{\r\n    padding-left: 25px;\r\n\r\n}\r\n\r\n.sb-m{\r\n    position: relative;\r\n    display: inline-block;\r\n    border: none;\r\n    outline: none;\r\n    background-color: transparent;\r\n    width: 8px;\r\n    height: 8px;\r\n    top: 8px;\r\n    left:0;\r\n    font-weight: 500;\r\n    font-size: 16px;\r\n    border-bottom: 2px solid;\r\n    border-left: 2px solid;\r\n    transform: rotateY(180deg) rotateZ(40deg);\r\n    transition: .16s;\r\n}";

    leistrap.addCss(menuCss);

    function leisMenu(useIcon, parent) {
        const pop = DropUp(null, null, false, parent);
        /**
        * @type {leistrap.Leistrap<HTMLElement> | HTMLElement }
        */
        let target = null;

        pop.pop.setClassName("leis-menu");
        const ul = leistrap.create("ul", {
            parent: pop.pop,
            className: "ls-ls-m",
            
        });


        /**
         * show the menu
         * @param {leistrap.Leistrap<HTMLElement>} elem 
         * @param {keyof WindowEventMap} evName 
         * @param {leistrap.Leistrap<HTMLElement>} win
         */
        function listen(elem, evName, win, option){
            win = win || leistrap.win;
          win.addEvent(evName, function (e) {
                e.preventDefault();
               if(!elem){
                move();
                return;
               }
                if(elem && elem._conf === e.target){
                    move();
               }
               
               function move(){
                MENU.target = e.target;
                let [x, y] = [e.clientX, e.clientY];
                if(option){
                    
                    x += option.x;
                    y += option.y; 
                    
                    
              
                }
               
                
                pop.move({
                    x,
                    y,
                    left: x,
                    top: y,
                    height: 10,
                    width: 10
                });
               }

            });

            
        }

        function addOption(icon, title, subTitle, subMenu_){
            const li = leistrap.create("li", {
                className : "ls-m-i leis-flex leis-row",
                parent : ul,
                content : rangeList(3).map( item => leistrap.create("div", {
                    className : `ls-i-${item}`
                }))
            });

     
            li.content[1].setText(title);
            if(subMenu_){
                li.add(subMenu_.pop.pop);
                
                li.content[2].setText("").setClassName("sb-m");
                li.addEvent("mouseenter", (e)=> showSubMenu(subMenu_, e, li));
                li.addEvent("mouseleave", ()=> hideSubMenu(subMenu_));
                
            }
            else {
                li.content[2].setText(subTitle);
            }
            
            {
                li.content[0].destroy();
                li.setClassName("nI");
            }
            return li
        }

        let MENU = {
            addOption,
            pop,
            target,
            listen
        };
        return MENU
    }



    let idMenu;
    function showSubMenu(pop, e, elem){
        
        if(idMenu){
            clearTimeout(idMenu);
        }
        
        idMenu = setTimeout(function(){
            pop.pop.move(elem._conf.getBoundingClientRect(), ["left", "right"]);
            clearTimeout(idMenu);
        }, 500);

    }

    function hideSubMenu(menu){
        if(idMenu){
            menu.pop.hide();
            clearTimeout(idMenu);
        }
         

    }

    let configGlobalMenu =  (function(){

        let menu = leisMenu();
        menu.pop.pop.setStyleSheet({
            width : "200px",
            position : "fixed"
        });

        let subMenu = leisMenu(null, "sb-m");
        subMenu.pop.pop.setStyleSheet({
            width : "300px"
        });
        menu.addOption(null, "Add element", "E+N").addEvent("click", function(){
            console.log(menu.target);
        });
        menu.addOption(null, 'subMenu', null,  subMenu);

        return menu
    })();

    function exposePageAPI(){

        const event = _EventEmitter();
       
        event.handle("add-pages", function(e, pageList, clb){
            pageList.forEach(item => {
                Root.createPage(item.name, item.name, function(page){
                    let body = leistrap.create("body");
                    body._conf = page._conf.contentDocument.body;
                    body._conf.innerHTML = ` <h1> ${item.name} page </h1>`;
                    body.addEvent("click", onPageClick);
                    body.addAttr("data-page", item);
                    body.addAttr("data-page", item.name);
                    leistrap.create("div");
                    configGlobalMenu.listen(null, "contextmenu", body, MenuRect );

                }, (p)=> onPageShow(p, item) );  

            });
        });
        
        function onPageShow(page, pageInfo){
            onPageInit(page, pageInfo);
            if(page.init){
               event.invoke("page:show", null, pageInfo);
            }
            
        }

        function onPageInit(page, pageInfo){
            if(!page.init){
                console.log("inti page");
                event.invoke("page-init", null, pageInfo,  function(data){
                    page._conf.contentDocument.body.innerHTML = data; 
                    page.init = true;  
                });
            }
        }


        const currElem = leistrap.create("div");
        let prevElem = null;
        let prevElemStyle;
        let cur ; 
        let pageName;
        leistrap.currentElement = currElem;
        

        function setPropToCurrentElement(ev, pageName){
           if( !currElem._conf.hasAttribute("data-prop")){
            let id = generateId(3, 6);
            currElem.addAttr("data-prop", JSON.stringify({initStyle: true, id}) );

            //init prop-style
            let styleCurElm = window.getComputedStyle(ev.target);   
            let initStyle = {};
            StylePropComponentEmitter.eventsList().concat(configProp.StyleEmitter.eventsList(), CSS_PROPS)
            .forEach (item=> initStyle[item] = styleCurElm[item] );
            event.invoke("page-style:init", null, id, pageName, initStyle);
           }

        }

        function setValueToPropStyleComponent(styleCurElm){
            configProp.StyleEmitter.eventsList().forEach(function(prop){
                if(has(prop, styleCurElm)){
                    configProp.StyleEmitter.invoke(prop, null, styleCurElm[prop]);
                }
                 
            });

            StylePropComponentEmitter.eventsList().forEach(function(prop){
                if(has(prop, styleCurElm)){
                    StylePropComponentEmitter.invoke(prop, null, styleCurElm[prop] );
                }
                
            });
            
        }

        function getCurElemProp(prop){
            return JSON.parse(currElem.getAttr("data-prop"))[prop]
        }


        function callDefHab(){
                leistrap.event.invoke("hidepopup");
                  //close colorPicker
                leistrap.event.invoke("colorPicker:close");
        }

        function onPageClick(ev){

            
            pageName = this.getAttr("data-page");
            currElem._conf = ev.target;
            setPropToCurrentElement(ev, pageName);
            cur = getCurElemProp("id");

            //request style object from page APi
            if(cur !== prevElem){

                event.invoke("page-element:selected", null, cur, pageName);
                event.invoke("page-style:get", null, cur, pageName, function(curStyle){
                    if(prevElemStyle){
                        event.invoke("page-style:save", null, prevElemStyle);
                    }
                    
                
                    currElem.styleData = curStyle;
                    prevElemStyle = {id: cur, style: currElem.styleData, pageName};
                    
                    setValueToPropStyleComponent(curStyle);
                    
                });
            }
            
            callDefHab();
            window.focus();
            prevElem = cur;
            
            
        }

        // listen to the cur style update event
        leistrap.event.handle("page-style:changed", function(e, style){
            event.invoke("page-style:changed", null, {cur, pageName, style});
        });
        event.handle("fls:add", function(ev, url){
            document.body.appendChild(leistrap.create('script', { src : url }).render());
        });
        globalThis.pageApi = event;

    }

    // import { leistrap } from "../leistrap/leistrap.js";
    // import { after, has, rangeList } from "../obj/index.js";
    // import { configProp } from "./confugProp.js";
    // import { addElement } from "./element.js";




    function APP(){

        exposePageAPI();
        // Root.whenReady = function(body){

        //     //  configure the adding element functionality
        //     addElement(Root.workSpace)
            
        //     let workSpaceBody = leistrap.create("div")
        //     workSpaceBody._conf = body
        //     workSpaceBody.key = "body"
        //     body.currentElement = workSpaceBody
            
        //     after(1000, function(){
        //         body.click()
        //         console.log("okey");
                
        //     })
            
        //     leistrap.currentElement = workSpaceBody
           

        //     leistrap.event.handle("body", function(e, elem){
        //         e.send(workSpaceBody)
        //         workSpaceBody.add(elem)
        //     })

        //     // add a style tag for loading google font
        //     let googleFont = leistrap.create("style", {parent : workSpaceBody})
        //     leistrap.event.handle("googleFontLoading", function(e, value){
        //         googleFont._conf.innerText += value
        //     })
            
       
        //     leistrap.event.handle("color-myColor:save", function(e, color, colorName){
        //         let colorData = JSON.parse(localStorage.getItem("myColor"))
        //         if(!colorName)
        //             colorData[color] = color
        //         else{
        //             colorData[colorName] = color
        //         }
        //         localStorage.removeItem("myColor")
        //         localStorage.setItem("myColor", JSON.stringify(colorData))
        //     })

            
        //     //get all element by a click
        //     Root.workSpace._conf.contentDocument.addEventListener("click", function(e){
        //         leistrap.currentElement = e.target.currentElement

        //         //call styleEmitter to handle elementChanged event
        //         configProp.StyleEmitter.invoke("elementChanged", null, leistrap.currentElement)
                       
        //         leistrap.event.invoke("hidepopup")
                
        //         // close colorPicker
        //         leistrap.event.invoke("colorPicker:close")

        //         // set mainWin focus
        //         window.focus()
                
        //     })

            
        //     // listen to the doubleClick event to change the target element the textContent

        //     Root.workSpace._conf.contentDocument.addEventListener("dblclick", function(e){
        //         e.target.style.userSelect = "none"
        //         e.preventDefault()
        //         if(has(e.target.tagName.toLowerCase(), ["button", "p", "a", "span"])){
        //             leistrap.event.invoke("element:dbclick", null, e.target.currentElement)
        //         }

        //        setTimeout(function(){
        //          e.target.style.userSelect = "auto"
        //        }, 500)
                
        //     })
        //     // listen to the cursor enter
        //     let prev
        //     let prevH
        //     Root.workSpace._conf.contentDocument.addEventListener("click", function(e){
        //         if(prev) {
        //             prev.setStyleSheet({
        //                 border : "none",
        //             })
        //         }
        //         if(e.target.currentElement){
        //             e.target.currentElement.setStyleSheet({
        //                 border : "1.5px solid blue"
        //             })
        //         }
        //         prev = e.target.currentElement
        //     })

        //     Root.workSpace._conf.contentDocument.addEventListener("mousemove", function(e){
        //         if(prevH) {
        //             prevH.setStyleSheet({
        //                 outline : "none",
        //             })
        //         }
        //         if(e.target.currentElement){
        //             e.target.currentElement.setStyleSheet({
        //                 outline : "1px solid red"
        //             })
        //         }
        //         prevH = e.target.currentElement
        //     })
        
        // }
    }

    var collaCss = "\r\n.colla-container{\r\n    position : relative\r\n}\r\n.colla-container .collaBtn{\r\n    cursor: pointer;\r\n    padding: 6px 40px;\r\n    padding-right: 0;\r\n    width: 100%;\r\n    overflow: hidden;\r\n    white-space: nowrap;\r\n    text-overflow: ellipsis;\r\n}\r\n.colla-cd{\r\n    max-height: 0;\r\n    overflow: hidden;\r\n    cursor: pointer;\r\n    transition: 1s ease max-height;\r\n}\r\n\r\n.colla-cd.clicked{\r\n    max-height: 300vh;\r\n}\r\n\r\n.colla-item{\r\n    padding: 6px 50px;\r\n    padding-right: 0;\r\n    width: 100%;\r\n    overflow: hidden;\r\n    white-space: nowrap;\r\n    text-overflow: ellipsis;\r\n\r\n    \r\n}\r\n\r\n.colla-item:hover,\r\n.colla-container .collaBtn:hover{\r\n    background-color: var(--leis-select-cl);\r\n\r\n}\r\n\r\n.colla-line{\r\n    position: absolute;\r\n    width: 2px;\r\n    height: calc(100% - 30px);\r\n    top: 20px;\r\n    left : 15Px;\r\n    background: #ddd;\r\n    outline: none;\r\n    border: none;\r\n\r\n}\r\n.colla-container .collaBtn.cd .arrow{\r\n    position: absolute;\r\n    display: inline-block;\r\n    border: none;\r\n    outline: none;\r\n    background-color: transparent;\r\n    width: 8px;\r\n    height: 8px;\r\n    top: 15px;\r\n    left: 20px;\r\n    font-weight: 500;\r\n    font-size: 16px;\r\n    border-bottom: 2px solid;\r\n    border-left: 2px solid;\r\n    transform: rotateY(180deg) rotateZ(40deg);\r\n    transition: .16s;\r\n}\r\n\r\n.colla-container .collaBtn.cd.clicked .arrow{\r\n        transform: rotateY(180deg) rotateZ(-40deg);\r\n}\r\n";

    leistrap.addCss(collaCss);

    /**
     * 
     * @param {leistrap.Leistrap<HTMLElement>} parent 
     * @param {string} btnText
     * @param {Array<leistrap.Leistrap<HTMLElement>>} items 
     */
    function leisCollapse(parent, btnText, items) {

      const paddings = {
        btn: 40, item: 50, arrow: 20
      };

      let card = leistrap.create("div", { className: "colla-cd" });


      const arrow = leistrap.create("button", {
        type: "button",
        className: "arrow",
      });

      let button = leistrap.create("div", {
        className: "collaBtn cd",
        text: btnText,
        content: [arrow]
      });

      const line = leistrap.create("div", {
        className: "colla-line"
      });

      const container = leistrap.create("div", {
        data: { type: "collapse" },
        content: [button, card, line],
        parent: parent,
        className: "colla-container",
        onclick: function (e) {
          if (this.child) e.stopPropagation();
          button.toggleClassName("clicked");
          card.toggleClassName("clicked");

        }
      });
      container.type = "collapse";
      card.padding = paddings;

      card.once("add", function (e, element) {
        if (element.type == "collapse") {
          element.child = true;

          element.content[0].setStyleSheet({ padding: `6px ${e.padding.item}px` });
          element.content[1].padding.btn = e.padding.item;
          element.content[1].padding.item = e.padding.item + 10;
          element.content[1].padding.arrow = e.padding.arrow + 10;

          element.content[1].content.forEach(item => {

            if (item.type != "collapse")
              item.setStyleSheet({ padding: `6px ${e.padding.item + 10}px` });
          });

          element.content[0].content[0].setStyleSheet({ left: (e.padding.arrow + 10).toString() + "px" });
          element.content[2].setStyleSheet({ left: (e.padding.arrow + 5).toString() + "px" });


        }
      });

      items.forEach(item => {
        card.add(item);
        item.setClassName("colla-item");
        item.addEvent("click", e => e.stopPropagation());
      });


      const COLLA = { container, card, button };
      return COLLA


    }

    ((function(){    

        const container = leistrap.create("div", {parent : Root.propSide});
        const sizeValues =  ["width", "min-width", "max-width", "height", "min-height", "max-height"];

        // display size props
        leisCollapse(container,"Size", sizeValues
            .map(function(item){
                const elem = setInput(item);

                elem.input.addEvent("click", function(){configProp.propEmitter.invoke("size");});
                SizeProp.setBtn(elem.input);
              
                configProp.StyleEmitter.handle(toCamelKey(item), function(event, value){
                    elem.input._conf.value = value;
                });
                
                return elem.container
        }) );
        
        //color
        leisCollapse(container, "Colors", ["color", "bg-color"].map(function(item, index){
            const elem = setInput(item);
            ColorProp.setBtn(elem.input);

            if(index == 0){
                elem.input.addEvent("click", function(){
                    configProp.propEmitter.invoke('color');
                    leistrap.event.invoke("clr-previous:set", null, leistrap.currentElement.styleData[item]);
                });
                
                leistrap.event.handle("colors:color", function(e){elem.input._conf.click();});
            }
            else {
                item = "backgroundColor";
                elem.input.addEvent("click", function(){
                    configProp.propEmitter.invoke(item);
                    
                    leistrap.event.invoke("clr-previous:set", null, leistrap.currentElement.styleData[item]);
                });
                leistrap.event.handle("colors:bg", function(e){elem.input._conf.click();});
            }

          
            
            configProp.StyleEmitter.handle(item, function(event, value){
                elem.input.setStyleSheet({backgroundColor: value});
            });
            return elem.container
        }));

        //typography
        const typo = ["font-size", "font-weight", "font-family",  ];
        leisCollapse(container, "Typography",typo.map(function(item){
        
            const elem = setInput(item);
            typographyProp.setBtn(elem.input);
            StyleEmitter.handle(toCamelKey(item), function(e, value){
                elem.input._conf.value = value;
            });

            elem.input.addEvent("click", function(){
                configProp.propEmitter.invoke("typography");
            });
            return elem.container

            
        }));

        //spacing

        leisCollapse(container, "Spacing",["padding", "margin"].map(function(item){
        
            const elem = setInput(item);
                SpacingProp.setBtn(elem.input);
                StyleEmitter.handle(toCamelKey(item), function(e, value){
                    elem.input._conf.value = value;
                });
        
                elem.input.addEvent("click", function(){
                    configProp.propEmitter.invoke("spacing");
                    leistrap.event.invoke("spacing-tab:"+item.toLowerCase());
                });
                return elem.container

            
        }));

        //border
        leisCollapse(container, "Border",["border", "border-radius"].map(function(item){
        
            const elem = setInput(item);
            
                BorderProp.setBtn(elem.input);
                StyleEmitter.handle(toCamelKey(item), function(e, value){
                    elem.input._conf.value = value;
                });
        
                elem.input.addEvent("click", function(){
                    configProp.propEmitter.invoke("border");
                });
                return elem.container

        }));


        // layout

        leisCollapse(container, "Layout",["display"].map(function(item){
        
            const elem = setInput(item);
            
                LayoutProp.setBtn(elem.input);
                StyleEmitter.handle(toCamelKey(item), function(e, value){
                    elem.input._conf.value = value;
                });
        
                elem.input.addEvent("click", function(){
                    configProp.propEmitter.invoke("layout");
                    let value = this._conf.value.split("-");
                    if(has("layout-show:"+value[value.length - 1], leistrap.event.eventsList())){
                        leistrap.event.invoke("layout-show:"+value[value.length - 1]);
                    }
                    else {
                        leistrap.event.invoke("layout-show");
                    }
                });
                return elem.container

        }));


         //Position
         leisCollapse(container, "Position",["position"].map(function(item){
        
            const elem = setInput(item);
                PositionProp.setBtn(elem.input);
                StyleEmitter.handle(toCamelKey(item), function(e, value){
                    elem.input._conf.value = value;
                });
        
                elem.input.addEvent("click", function(){
                    configProp.propEmitter.invoke("position");
                });
                return elem.container

        }));

        function setInput(lbl){
            const elem = textBox(null, lbl);
            elem.container.setStyleSheet({flexDirection : "row", justifyContent : "space-between"});
            elem.input.setStyleSheet({width : "50%"})
            .addAttr("readonly", "true");
            elem.label.setStyleSheet({fontSize : "15px"});

            return elem
        }
        return {
            container

        }
    }))();

    leistrap.whenReady(function(){
      APP();
      this.add(Root.container);

    });

    leistrap.render("main");

})();
