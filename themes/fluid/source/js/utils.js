/* global Fluid, CONFIG */

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;

Fluid.utils = {

  listenScroll: function(callback) {
    var dbc = new Debouncer(callback);
    window.addEventListener('scroll', dbc, false);
    dbc.handleEvent();
    return dbc;
  },

  unlistenScroll: function(callback) {
    window.removeEventListener('scroll', callback);
  },

  listenDOMLoaded(callback) {
    if (document.readyState !== 'loading') {
      callback();
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        callback();
      });
    }
  },

  scrollToElement: function(target, offset) {
    var of = jQuery(target).offset();
    if (of) {
      jQuery('html,body').animate({
        scrollTop: of.top + (offset || 0),
        easing   : 'swing'
      });
    }
  },

  elementVisible: function(element, offsetFactor) {
    offsetFactor = offsetFactor && offsetFactor >= 0 ? offsetFactor : 0;
    var rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return (
      (rect.top >= 0 && rect.top <= viewportHeight * (1 + offsetFactor) + rect.height / 2) ||
      (rect.bottom >= 0 && rect.bottom <= viewportHeight * (1 + offsetFactor) + rect.height / 2)
    );
  },

  waitElementVisible: function(selectorOrElement, callback, offsetFactor) {
    var runningOnBrowser = typeof window !== 'undefined';
    var isBot = (runningOnBrowser && !('onscroll' in window))
      || (typeof navigator !== 'undefined' && /(gle|ing|ro|msn)bot|crawl|spider|yand|duckgo/i.test(navigator.userAgent));
    if (!runningOnBrowser || isBot) {
      return;
    }

    offsetFactor = offsetFactor && offsetFactor >= 0 ? offsetFactor : 0;

    function waitInViewport(element) {
      Fluid.utils.listenDOMLoaded(function() {
        if (Fluid.utils.elementVisible(element, offsetFactor)) {
          callback();
          return;
        }
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function(entries, ob) {
            if (entries[0].isIntersecting) {
              callback();
              ob.disconnect();
            }
          }, {
            threshold : [0],
            rootMargin: (window.innerHeight || document.documentElement.clientHeight) * offsetFactor + 'px'
          });
          io.observe(element);
        } else {
          var wrapper = Fluid.utils.listenScroll(function() {
            if (Fluid.utils.elementVisible(element, offsetFactor)) {
              Fluid.utils.unlistenScroll(wrapper);
              callback();
            }
          });
        }
      });
    }

    if (typeof selectorOrElement === 'string') {
      this.waitElementLoaded(selectorOrElement, function(element) {
        waitInViewport(element);
      });
    } else {
      waitInViewport(selectorOrElement);
    }
  },

  waitElementLoaded: function(selector, callback) {
    var runningOnBrowser = typeof window !== 'undefined';
    var isBot = (runningOnBrowser && !('onscroll' in window))
      || (typeof navigator !== 'undefined' && /(gle|ing|ro|msn)bot|crawl|spider|yand|duckgo/i.test(navigator.userAgent));
    if (!runningOnBrowser || isBot) {
      return;
    }

    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function(records, ob) {
        var ele = document.querySelector(selector);
        if (ele) {
          callback(ele);
          ob.disconnect();
        }
      });
      mo.observe(document, { childList: true, subtree: true });
    } else {
      Fluid.utils.listenDOMLoaded(function() {
        var waitLoop = function() {
          var ele = document.querySelector(selector);
          if (ele) {
            callback(ele);
          } else {
            setTimeout(waitLoop, 100);
          }
        };
        waitLoop();
      });
    }
  },

  createScript: function(url, onload) {
    var s = document.createElement('script');
    s.setAttribute('src', url);
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('charset', 'UTF-8');
    s.async = false;
    if (typeof onload === 'function') {
      if (window.attachEvent) {
        s.onreadystatechange = function() {
          var e = s.readyState;
          if (e === 'loaded' || e === 'complete') {
            s.onreadystatechange = null;
            onload();
          }
        };
      } else {
        s.onload = onload;
      }
    }
    var ss = document.getElementsByTagName('script');
    var e = ss.length > 0 ? ss[ss.length - 1] : document.head || document.documentElement;
    e.parentNode.insertBefore(s, e.nextSibling);
  },

  createCssLink: function(url) {
    var l = document.createElement('link');
    l.setAttribute('rel', 'stylesheet');
    l.setAttribute('type', 'text/css');
    l.setAttribute('href', url);
    var e = document.getElementsByTagName('link')[0]
      || document.getElementsByTagName('head')[0]
      || document.head || document.documentElement;
    e.parentNode.insertBefore(l, e);
  },

  loadComments: function(selector, loadFunc) {
    var ele = document.querySelector('#comments[lazyload]');
    if (ele) {
      var callback = function() {
        loadFunc();
        ele.removeAttribute('lazyload');
      };
      Fluid.utils.waitElementVisible(selector, callback, CONFIG.lazyload.offset_factor);
    } else {
      loadFunc();
    }
  },

  getBackgroundLightness(selectorOrElement) {
    var ele = selectorOrElement;
    if (typeof selectorOrElement === 'string') {
      ele = document.querySelector(selectorOrElement);
    }
    var view = ele.ownerDocument.defaultView;
    if (!view) {
      view = window;
    }
    var rgbArr = view.getComputedStyle(ele).backgroundColor.replace(/rgba*\(/, '').replace(')', '').split(/,\s*/);
    if (rgbArr.length < 3) {
      return 0;
    }
    var colorCast = (0.213 * rgbArr[0]) + (0.715 * rgbArr[1]) + (0.072 * rgbArr[2]);
    return colorCast === 0 || colorCast > 255 / 2 ? 1 : -1;
  },

  retry(handler, interval, times) {
    if (times <= 0) {
      return;
    }
    var next = function() {
      if (--times >= 0 && !handler()) {
        setTimeout(next, interval);
      }
    };
    setTimeout(next, interval);
  },

  /**
   * 滚动位置记忆管理器
   */
  scrollMemoryManager: {
    /**
     * 获取当前页面的存储键名
     * @returns {string}
     */
    getStorageKey() {
      return `fluid_scroll_${window.location.pathname}`;
    },

    /**
     * 保存当前页面的滚动位置
     */
    saveScrollPosition() {
      const scrollData = {
        position: window.scrollY,
        timestamp: Date.now()
      };
      localStorage.setItem(
        this.getStorageKey(),
        JSON.stringify(scrollData)
      );
    },

    /**
     * 恢复页面的滚动位置
     */
    restoreScrollPosition() {
      const key = this.getStorageKey();
      const scrollStr = localStorage.getItem(key);

      if (!scrollStr) return;

      try {
        const scrollData = JSON.parse(scrollStr);
        // 检查数据是否在24小时内
        if (Date.now() - scrollData.timestamp < 24 * 60 * 60 * 1000) {
          this.scrollToPosition(scrollData.position);
        } else {
          // 清除过期数据
          localStorage.removeItem(key);
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    },

    /**
     * 滚动到指定位置
     * @param {number} position - 目标滚动位置
     */
    scrollToPosition(position) {
      if (typeof position !== 'number') return;

      // 立即滚动
      window.scrollTo(0, position);

      // 使用 requestAnimationFrame 确保在下一帧渲染时滚动
      requestAnimationFrame(() => {
        window.scrollTo(0, position);

        // 额外的延迟滚动以处理动态内容
        setTimeout(() => {
          window.scrollTo({
            top: position,
            behavior: 'auto'
          });
        }, 150);
      });
    },

    /**
     * 清理过期的滚动位置数据
     */
    cleanupScrollData() {
      const keys = Object.keys(localStorage);
      const scrollKeys = keys.filter(key => key.startsWith('fluid_scroll_'));
      const now = Date.now();
      const expireTime = 24 * 60 * 60 * 1000; // 24小时过期

      scrollKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (now - data.timestamp > expireTime) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      });
    },

    /**
     * 初始化滚动位置记忆功能
     */
    init() {
      // 页面加载完成后恢复滚动位置
      Fluid.utils.listenDOMLoaded(() => {
        this.restoreScrollPosition();
        this.cleanupScrollData();
      });

      // 页面卸载前保存滚动位置
      window.addEventListener('beforeunload', () => {
        this.saveScrollPosition();
      });

      // 支持 pjax
      document.addEventListener('pjax:complete', () => {
        this.restoreScrollPosition();
      });
    }
  }

};

/**
 * Handles debouncing of events via requestAnimationFrame
 * @see http://www.html5rocks.com/en/tutorials/speed/animations/
 * @param {Function} callback The callback to handle whichever event
 */
function Debouncer(callback) {
  this.callback = callback;
  this.ticking = false;
}

Debouncer.prototype = {
  constructor: Debouncer,

  /**
   * dispatches the event to the supplied callback
   * @private
   */
  update: function() {
    this.callback && this.callback();
    this.ticking = false;
  },

  /**
   * ensures events don't get stacked
   * @private
   */
  requestTick: function() {
    if (!this.ticking) {
      requestAnimationFrame(this.rafCallback || (this.rafCallback = this.update.bind(this)));
      this.ticking = true;
    }
  },

  /**
   * Attach this as the event listeners
   */
  handleEvent: function() {
    this.requestTick();
  }
};

// 初始化滚动位置记忆功能
Fluid.utils.scrollMemoryManager.init();
