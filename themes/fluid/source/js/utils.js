/* global Fluid, CONFIG */

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;

Fluid.utils = {

  listenScroll: function(callback) {
    var dbc = new Debouncer(callback);
    window.addEventListener('scroll', dbc, false);
    dbc.handleEvent();

    // 在滚动时保存位置
    var savePosition = new Debouncer(() => {
      const scrollData = {
        position: window.scrollY,
        timestamp: Date.now()
      };
      localStorage.setItem(
        `fluid_scroll_${window.location.pathname}`,
        JSON.stringify(scrollData)
      );
    });
    window.addEventListener('scroll', savePosition, false);

    return dbc;
  },

  unlistenScroll: function(callback) {
    window.removeEventListener('scroll', callback);
  },

  // 修改 listenDOMLoaded 函数中的恢复滚动位置逻辑
  listenDOMLoaded(callback) {
    const wrappedCallback = () => {
      const key = `fluid_scroll_${window.location.pathname}`;
      const scrollStr = localStorage.getItem(key);

      if (scrollStr) {
        try {
          const scrollData = JSON.parse(scrollStr);
          if (Date.now() - scrollData.timestamp < 24 * 60 * 60 * 1000) {
            // 1. 先设置一个最小高度，确保有足够的滚动空间
            document.body.style.minHeight = `${scrollData.position + window.innerHeight}px`;

            // 2. 立即滚动到保存的位置
            this.scrollToElement('body', scrollData.position);

            // 3. 等待内容加载后再次尝试滚动
            const checkAndScroll = () => {
              // 如果当前页面高度小于保存的滚动位置，说明内容还在加载
              if (document.documentElement.scrollHeight <= scrollData.position + window.innerHeight) {
                // 200ms 后再次检查
                setTimeout(checkAndScroll, 200);
              } else {
                // 内容加载完成，移除临时设置的最小高度
                document.body.style.minHeight = '';
                // 最后一次滚动到正确位置
                this.scrollToElement('body', scrollData.position);
              }
            };

            // 启动检查
            setTimeout(checkAndScroll, 200);
          } else {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }

      callback();
    };

    if (document.readyState !== 'loading') {
      wrappedCallback();
    } else {
      document.addEventListener('DOMContentLoaded', wrappedCallback);
    }
  },

  scrollToElement: function(target, offset) {
    // 如果 offset 是数字，直接滚动到指定位置
    if (typeof offset === 'number') {
      window.scrollTo({
        top: offset,
        behavior: 'auto'
      });

      // 使用 requestAnimationFrame 确保滚动位置正确
      requestAnimationFrame(() => {
        window.scrollTo({
          top: offset,
          behavior: 'auto'
        });

        // 额外的延迟滚动以处理动态内容
        setTimeout(() => {
          window.scrollTo({
            top: offset,
            behavior: 'auto'
          });
        }, 150);
      });
      return;
    }

    // 原有的滚动到元素逻辑
    var of = jQuery(target).offset();
    if (of) {
      jQuery('html,body').animate({
        scrollTop: of.top + (offset || 0),
        easing: 'swing'
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


// 在页面卸载前保存最后的滚动位置
window.addEventListener('beforeunload', () => {
  const scrollData = {
    position: window.scrollY,
    timestamp: Date.now()
  };
  localStorage.setItem(
    `fluid_scroll_${window.location.pathname}`,
    JSON.stringify(scrollData)
  );
});

// 支持 pjax
document.addEventListener('pjax:complete', () => {
  const key = `fluid_scroll_${window.location.pathname}`;
  const scrollStr = localStorage.getItem(key);

  if (scrollStr) {
    try {
      const scrollData = JSON.parse(scrollStr);
      if (Date.now() - scrollData.timestamp < 24 * 60 * 60 * 1000) {
        Fluid.utils.scrollToElement('body', scrollData.position);
      }
    } catch (e) {
      localStorage.removeItem(key);
    }
  }
});

// 定期清理过期的滚动位置数据
function cleanupScrollData() {
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
}

// 每天执行一次清理
setInterval(cleanupScrollData, 24 * 60 * 60 * 1000);
