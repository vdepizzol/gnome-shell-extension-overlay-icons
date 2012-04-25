const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Main = imports.ui.main;
const Tweener = imports.tweener.tweener;
const Workspace = imports.ui.workspace;


const WINDOWOVERLAY_ICON_SIZE = 140;
const WINDOWOVERLAY_BOX_SIZE = 160;
const WINDOWOVERLAY_BOX_SIZE_MIN = 50;
const WINDOWOVERLAY_BOX_RADIUS = 10;
const WINDOWOVERLAY_BOX_RADIUS_MIN = 5;

function injectToFunction(parent, name, func) {
    let origin = parent[name];
    parent[name] = function() {
        let ret;
        ret = origin.apply(this, arguments);
        if (ret === undefined)
                ret = func.apply(this, arguments);
        return ret;
    }
    return origin;
}

let wsWinOverInjections, createdActors;

function resetState() {
    wsWinOverInjections = { };
    createdActors = [ ];
}

function enable() {
    resetState();

    wsWinOverInjections['_init'] = undefined;
    wsWinOverInjections['hide'] = undefined;
    wsWinOverInjections['show'] = undefined;
    wsWinOverInjections['_onEnter'] = undefined;
    wsWinOverInjections['_onLeave'] = undefined;
    wsWinOverInjections['updatePositions'] = undefined;
    wsWinOverInjections['_onDestroy'] = undefined;

    wsWinOverInjections['_init'] = injectToFunction(Workspace.WindowOverlay.prototype, '_init', function(windowClone, parentActor) {
        this._icon = null;

        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(windowClone.metaWindow);

        if (app) {
            this._icon = app.create_icon_texture(WINDOWOVERLAY_ICON_SIZE);
        }
        if (!this._icon) {
            this._icon = new St.Icon({ icon_name: 'applications-other',
                                       icon_type: St.IconType.FULLCOLOR,
                                       icon_size: WINDOWOVERLAY_ICON_SIZE });
        }
        this._icon.width = WINDOWOVERLAY_ICON_SIZE;
        this._icon.height = WINDOWOVERLAY_ICON_SIZE;

        this._applicationIconBox = new St.Bin({ style_class: 'windowoverlay-application-icon-box' });
        this._applicationIconBox.set_opacity(0);
        this._applicationIconBox.add_actor(this._icon);

        createdActors.push(this._applicationIconBox);
        parentActor.add_actor(this._applicationIconBox);
    });

    wsWinOverInjections['hide'] = injectToFunction(Workspace.WindowOverlay.prototype, 'hide', function() {
        Tweener.addTween(this._applicationIconBox, { time: 0.1,
                                                     opacity: 0,
                                                     transition: 'linear' });
    });

    wsWinOverInjections['show'] = injectToFunction(Workspace.WindowOverlay.prototype, 'show', function() {
        this._applicationIconBox.set_opacity(0);
        Tweener.addTween(this._applicationIconBox, { time: 0.25,
                                                     opacity: 255,
                                                     transition: 'linear' });
    });

    wsWinOverInjections['_onEnter'] = injectToFunction(Workspace.WindowOverlay.prototype, '_onEnter', function() {
        Tweener.addTween(this._applicationIconBox, { time: 0.2,
                                                     opacity: 50,
                                                     transition: 'linear' });
    });
    wsWinOverInjections['_onLeave'] = injectToFunction(Workspace.WindowOverlay.prototype, '_onLeave', function() {
        Tweener.addTween(this._applicationIconBox, { time: 0.2,
                                                     opacity: 255,
                                                     transition: 'linear' });
    });

    wsWinOverInjections['updatePositions'] = injectToFunction(Workspace.WindowOverlay.prototype, 'updatePositions', function(cloneX, cloneY, cloneWidth, cloneHeight) {
        let iconBox = this._applicationIconBox;
        let icon = this._icon;

        // Calculate the size of the box to be half the size of the smallest dimension, with max and min values
        let boxSize = WINDOWOVERLAY_BOX_SIZE;
        if (cloneWidth < cloneHeight) {
            boxSize = Math.max(Math.min(cloneWidth / 2, WINDOWOVERLAY_BOX_SIZE), WINDOWOVERLAY_BOX_SIZE_MIN);
        } else {
            boxSize = Math.max(Math.min(cloneHeight / 2, WINDOWOVERLAY_BOX_SIZE), WINDOWOVERLAY_BOX_SIZE_MIN);
        }

        // Set the size of the box and the icon
        iconBox.width = Math.floor(boxSize);
        iconBox.height = iconBox.width;
        icon.width = Math.floor(iconBox.width * WINDOWOVERLAY_ICON_SIZE / WINDOWOVERLAY_BOX_SIZE);
        icon.height = icon.width;

        // Set the border radius proportional to the size of the box compared to max and min size
        let borderRadius = WINDOWOVERLAY_BOX_RADIUS_MIN + ((iconBox.width - WINDOWOVERLAY_BOX_SIZE_MIN) / (WINDOWOVERLAY_BOX_SIZE - WINDOWOVERLAY_BOX_SIZE_MIN)) * (WINDOWOVERLAY_BOX_RADIUS - WINDOWOVERLAY_BOX_RADIUS_MIN);
        iconBox.set_style('border-radius: ' + Math.floor(borderRadius) + 'px');

        let iconBoxX = cloneX + (cloneWidth / 2) - (icon.width / 2);
        let iconBoxY = cloneY + (cloneHeight / 2) - (icon.height / 2);

        iconBox.set_position(Math.floor(iconBoxX), Math.floor(iconBoxY));
    });

    wsWinOverInjections['_onDestroy'] = injectToFunction(Workspace.WindowOverlay.prototype, '_onDestroy', function() {
        this._applicationIconBox.destroy();
    });

}

function removeInjection(object, injection, name) {
    if (injection[name] === undefined)
        delete object[name];
    else
        object[name] = injection[name];
}

function disable() {
    for (i in wsWinOverInjections) {
        removeInjection(Workspace.WindowOverlay.prototype, wsWinOverInjections, i);
    }
    for each (i in createdActors)
        i.destroy();
    resetState();
}

function init() {
    /* do nothing */
}

/* 3.0 API backward compatibility */
function main() {
    init();
    enable();
}
