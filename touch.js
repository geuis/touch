var touch = function(el, preventDefaultDirection){
//preventDefaultDirections:
//none: default, not required to be specified. 
//all: preventDefault on touchmove event in all directions
//horizontal: preventDefault on horizontal movements
//vertical: preventDefault on vertical movements

    if( !preventDefaultDirection ){
        preventDefaultDirection = 'none';
    }

    //hacky json serialization cleanup thing.
    var touchSerialize = function(){
        var tmp = [];
        arr = Array.prototype.slice.call(touches);
        arr.forEach(function(x, y){

            var keys = Object.keys(x),
                obj = {};
            keys.forEach(function(w, z){
                obj[w] = arr[y][w].toString();
            });

            tmp.push( obj );

        });

        return tmp;
    }

    var touchArray = function(ev){
        if( !ev['touches'] ) return []; //gesture events dont have touches
        return Array.prototype.slice.call(ev.touches);
    }

    var checkPreventDefault = function(event_name, event, preventDirection){

        //Stop movement in defined directions
        if( preventDirection === 'all' ){
            event.preventDefault();
        }

        if( preventDirection === 'vertical'){

            if( Math.abs( touchData.move_pos.y - touchData.start_pos.y ) > 10 ){
                event.preventDefault();
            }

        }

        if( preventDirection === 'horizontal'){

            if( Math.abs( touchData.move_pos.x - touchData.start_pos.x ) > 10 ){
                event.preventDefault();
            }

        }

    };

    var touchData = {
        start: 0,
        start_pos: 0,
        end: 0,
        move: 0,
        move_pos: 0,
        taps: 0,
        startScale: 0
    }

    var doubleTapTimeout = false,
        longPressTimeout = false;

    //reset touch events
    var touchCleanup = function(){
        clearTimeout(doubleTapTimeout);
        clearTimeout(longPressTimeout);
        touchData.start = touchData.end = touchData.taps = 0;
        doubleTapTimeout = longPressTimeout = false;    
    }

    var touchEvents = {
        'tap': new CustomEvent('tap', {
            bubbles: false,
            cancelable: true,
            detail:{}
        }),
        
        'double_tap': new CustomEvent('double_tap', {
            bubbles: false,
            cancelable: true,
            detail:{}
        }),

        'long_press': new CustomEvent('long_press', {
            bubbles: false,
            cancelable: true,
            detail:{}
        }),

        'drag': new CustomEvent('drag', {
            bubbles: false,
            cancelable: true,
            detail:{}
        }),
        
        'swipe': new CustomEvent('swipe', {
            bubbles: false,
            cancelable: true,
            detail:{}
        }),

        'pinch': new CustomEvent('pinch', {
            bubbles: false,
            cancelable: true,
            detail:{}
        })
    }
    
    var touchManager = function(event_name, ev, el, preventDirection){

        //browsers seem to lose track of currentTarget on the event object when accessed inside a setTimeout. Caching works.
        var currentTarget = ev.currentTarget,
            target = ev.srcElement || ev.target;

        //single touch
        if( touches.length < 2 ){

            //reset events
            if( event_name === 'touchcancel' ){
                touchCleanup();
            }

            if( event_name === 'touchstart' ){

                touchData.start = new Date().getTime();
                touchData.start_pos = {x: ev.touches[0].pageX, y: ev.touches[0].pageY};

                if( !doubleTapTimeout || !longPressTimeout ){

                    clearTimeout(doubleTapTimeout);
                    clearTimeout(longPressTimeout);

                    //double tap, resolves single tab
                    doubleTapTimeout = setTimeout(function(){

                        if( touchData.taps === 1 ){

                            clearTimeout(longPressTimeout);

                            //reference to DOM element where event occurs
                            touchEvents.tap.detail.currentTarget = currentTarget;
                            touchEvents.tap.detail.target = target;
                            touchEvents.tap.detail.el = el;
                            touchEvents.tap.detail.event = ev;

                            //dispatch tap event
                            window.dispatchEvent(touchEvents.tap);

                        }

                        if( touchData.taps >= 2 ){
                            clearTimeout(longPressTimeout);

                            //reference to DOM element where event occurs
                            touchEvents.double_tap.detail.currentTarget = currentTarget;
                            touchEvents.double_tap.detail.target = target;
                            touchEvents.double_tap.detail.el = el;
                            touchEvents.double_tap.detail.event = ev;

                            //dispatch tap event
                            window.dispatchEvent(touchEvents.double_tap);

                        }
                        touchData.start = touchData.start_pos = touchData.end = touchData.taps = 0;
                        doubleTapTimeout = longPressTimeout = false;

                    }, 300);

                    //long tap
                    longPressTimeout = setTimeout(function(){

                        if( touchData.taps === 0 ){

                            //reference to DOM element where event occurs
                            touchEvents.long_press.detail.currentTarget = currentTarget;
                            touchEvents.long_press.detail.target = target;
                            touchEvents.long_press.detail.el = el;
                            touchEvents.long_press.detail.event = ev;

                            //dispatch long press event
                            window.dispatchEvent(touchEvents.long_press);

                        }

                        touchData.start = touchData.start_pos = touchData.end = touchData.taps = 0;
                        doubleTapTimeout = longPressTimeout = false;

                    }, 500);

                }

            }
            
            if( event_name === 'touchmove' ){

                if( doubleTapTimeout || longPressTimeout ){

                    clearTimeout(doubleTapTimeout);
                    clearTimeout(longPressTimeout);
                    doubleTapTimeout = longPressTimeout = false;

                }

                //start times and position may be reset if a long_press timeout has completed.
                if( touchData.start === 0 ){
                    touchData.start = new Date().getTime();
                    touchData.start_pos = {x: ev.touches[0].pageX, y: ev.touches[0].pageY};
                }

                touchData.move = new Date().getTime();
                touchData.move_pos = {x: ev.touches[0].pageX, y: ev.touches[0].pageY};

                //check if preventDefault() should be called
                checkPreventDefault(event_name, ev, preventDirection);

                //emit drag event
                //reference to DOM element where event occurs
                touchEvents.drag.detail.currentTarget = currentTarget;
                touchEvents.drag.detail.target = target;
                touchEvents.drag.detail.el = el;
                touchEvents.drag.detail.event = ev;

                touchEvents.drag.detail.start_pos = touchData.start_pos;
                touchEvents.drag.detail.move_pos = touchData.move_pos;

                //dispatch drag event
                window.dispatchEvent(touchEvents.drag);

            }
            

            if( event_name === 'touchend' ){

                touchData.end = new Date().getTime();
                
                //tap happened
                if( touchData.end - touchData.start < 150 && touchData.move === 0 ){
                    touchData.taps++;
                }

                if( touchData.move !== 0 ){

                    //Detect swipe
                    //Time < 150ms seems to be a swipe
                    //Minimum distance: 10px;
                    //Detect 12 directions of swipe (360/12)

                    var time = touchData.end - touchData.start,
                        dist = Math.abs( ((touchData.move_pos.x - touchData.start_pos.x) ^ 2) + ((touchData.move_pos.y - touchData.start_pos.y) ^ 2) );

                    if( time < 200 && dist > 10 ){ 

                        //detect direction of swipe
                        var angle = Math.atan2(touchData.move_pos.y-touchData.start_pos.y, touchData.move_pos.x-touchData.start_pos.x) * 180 / Math.PI;

                        //convert to 360 percentage
                        if( angle < 0 ) angle = 360 - Math.abs(angle);

                        var region = Math.floor(angle / 30);

                        angle = Math.round(angle);

                        //reference to DOM element where event occurs
                        touchEvents.swipe.detail.currentTarget = currentTarget;
                        touchEvents.swipe.detail.target = target;
                        touchEvents.swipe.detail.el = el;
                        touchEvents.swipe.detail.event = ev;

                        touchEvents.swipe.detail.angle = angle;
                        touchEvents.swipe.detail.region = region;
                        touchEvents.swipe.detail.distance = dist;
                        
                        //set directions. +/- 15 (30 degree arc)
                        var direction;
                        angle >= 345 || angle <= 15?
                            direction = 'right':
                        angle >= 75 && angle <= 105?
                            direction = 'down':
                        angle >= 165 && angle <= 195?
                            direction = 'left':
                        angle >= 255 && angle <= 285?
                            direction = 'up':
                        null;
                        
                        //Convenience direction for commonly used directions.
                        touchEvents.swipe.detail.direction = direction;

                        //dispatch swipe event
                        window.dispatchEvent(touchEvents.swipe);

                    }

                    touchData.move = 0;
                    touchData.move_pos = 0;
                    touchData.start_pos = 0;

                }

                //reset scale value
                touchData.scale = 0;
                touchData.startTouchesDistance = 0;
            }


        }

        //double touch
        if( touches.length === 2 ){
            //cancel any existing touch events in progress
            touchCleanup();

            //check if preventDefault() should be called
            checkPreventDefault(event_name, ev, preventDirection);

            var distance = function(p1, p2){
                return Math.sqrt( Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) );
            }

            //Pinch events
            if( touches[0].target === touches[1].target ){

                if( !touchData.startTouchesDistance ){
                    touchData.startTouchesDistance = distance( {x:touches[0].pageX, y:touches[0].pageY}, {x:touches[1].pageX, y:touches[1].pageY} ) 
                }

                var currentScale = distance( {x:touches[0].pageX, y:touches[0].pageY}, {x:touches[1].pageX, y:touches[1].pageY}) / touchData.startTouchesDistance;

                //reference to DOM element where event occurs
                touchEvents.pinch.detail.currentTarget = currentTarget;
                touchEvents.pinch.detail.target = target;
                touchEvents.pinch.detail.el = el;
                touchEvents.pinch.detail.event = ev;

                touchEvents.pinch.detail.scale = currentScale;

                //dispatch swipe event
                window.dispatchEvent(touchEvents.pinch);

            }

        }

        touches = [];

    }

    var events = [
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel'
    ];

    //select elements
    var els = Array.prototype.slice.call(document.querySelectorAll(el)),        
        touches = [];

    //add touch events to each element
    els.forEach(function(item, index){

        events.forEach(function(ev_name, i){

            (function(){

                var preventDirection = preventDefaultDirection;

                item.addEventListener(ev_name, function(ev){

                    //convert touches object into an array
                    touches = touchArray(ev);
                    touchManager(ev_name, ev, item, preventDirection);

                }, false);

            })();

        });

    });


    return {

        //tap
        tap: function(fn){

            (function(){

                var these_els = els;

                window.addEventListener('tap', function(ev){

                    //stop events from occurring on more than the targetted element
                    if( ev.cancelable ) ev.stopPropagation();

                    //currentTarget is the item the event was triggered on. Ensure it and the original bound element(el) match
                    if( these_els.indexOf(ev.detail.el) > -1 && ev.detail.currentTarget === ev.detail.el ){
                        fn.call(ev.detail.el, ev);
                    }

                }, false);

            })();

            return this;
        },

        //double-tap
        doubleTap: function(fn){

            (function(){

                var these_els = els;
                
                window.addEventListener('double_tap', function(ev){

                    //stop events from occurring on more than the targetted element
                    if( ev.cancelable ) ev.stopPropagation();

                    //currentTarget is the item the event was triggered on. Ensure it and the original bound element(el) match
                    if( these_els.indexOf(ev.detail.el) > -1 && ev.detail.currentTarget === ev.detail.el ){
                        fn.call(ev.detail.el, ev);
                    }

                }, false);
            
            })();

            return this;
        },

        //long press
        longPress: function(fn){

            (function(){

                var these_els = els;

                window.addEventListener('long_press', function(ev){

                    //stop events from occurring on more than the targetted element
                    if( ev.cancelable ) ev.stopPropagation();

                    //currentTarget is the item the event was triggered on. Ensure it and the original bound element(el) match
                    if( these_els.indexOf(ev.detail.el) > -1 && ev.detail.currentTarget === ev.detail.el ){
                        fn.call(ev.detail.el, ev);
                    }

                }, false);

            })();

            return this;
        },
        
        //drag
        drag: function(fn){

            (function(){

                var these_els = els;

                window.addEventListener('drag', function(ev){

                    //stop events from occurring on more than the targetted element
                    if( ev.cancelable ) ev.stopPropagation();

                    //currentTarget is the item the event was triggered on. Ensure it and the original bound element(el) match
                    if( these_els.indexOf(ev.detail.el) > -1 && ev.detail.currentTarget === ev.detail.el ){
                        fn.call(ev.detail.el, ev);
                    }

                }, false);

            })();

            return this;

        },
        
        //swipe
        swipe: function(fn){

            (function(){

                var these_els = els;

                window.addEventListener('swipe', function(ev){

                    //stop events from occurring on more than the targetted element
                    if( ev.cancelable ) ev.stopPropagation();

                    //currentTarget is the item the event was triggered on. Ensure it and the original bound element(el) match
                    if( these_els.indexOf(ev.detail.el) > -1 && ev.detail.currentTarget === ev.detail.el ){
                        fn.call(ev.detail.el, ev);
                    }

                }, false);

            })();

            return this;

        },
        
        pinch: function(fn){

            (function(){

                var these_els = els;

                window.addEventListener('pinch', function(ev){

                    //stop events from occurring on more than the targetted element
                    if( ev.cancelable ) ev.stopPropagation();

                    //currentTarget is the item the event was triggered on. Ensure it and the original bound element(el) match
                    if( these_els.indexOf(ev.detail.el) > -1 && ev.detail.currentTarget === ev.detail.el ){
                        fn.call(ev.detail.el, ev);
                    }

                }, false);

            })();

            return this;

        }

    }

}

