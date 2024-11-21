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


  // 添加状态管理相关的方法
  stateManager: {
    saveState: function() {
      if (window.location.pathname.includes('/categories/')) {
        const state = {
          scrollPosition: window.scrollY,
          timestamp: new Date().getTime()
        };
        sessionStorage.setItem('fluidState', JSON.stringify(state));
      }
    },

    restoreState: function() {
      if (window.location.pathname.includes('/categories/')) {
        const stateStr = sessionStorage.getItem('fluidState');
        if (stateStr) {
          const state = JSON.parse(stateStr);
          // 检查状态是否在30分钟内保存的
          if (new Date().getTime() - state.timestamp < 30 * 60 * 1000) {
            this.restoreScroll(state.scrollPosition);
          } else {
            sessionStorage.removeItem('fluidState');
          }
        }
      }
    },

    restoreScroll: function(position) {
      if (typeof position !== 'number') return;

      // 立即滚动到保存的位置
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
    }
  },

  // 添加分类管理相关的方法
  categoryManager: {
    init: function() {
      this.bindEvents();
      this.restoreCategory();
    },

    bindEvents: function() {
      const categories = document.querySelectorAll('.category-list-item');
      categories.forEach(category => {
        category.addEventListener('click', (e) => {
          const link = category.querySelector('.category-list-link');
          if (link) {
            const categoryName = link.textContent.trim();
            this.saveCategory(categoryName);
          }
        });
      });
    },

    saveCategory: function(category) {
      if (category) {
        const state = JSON.parse(sessionStorage.getItem('fluidState') || '{}');
        state.selectedCategory = category;
        sessionStorage.setItem('fluidState', JSON.stringify(state));
      }
    },

    restoreCategory: function() {
      const stateStr = sessionStorage.getItem('fluidState');
      if (stateStr) {
        const state = JSON.parse(stateStr);
        if (state.selectedCategory) {
          const categories = document.querySelectorAll('.category-list-link');
          categories.forEach(link => {
            if (link.textContent.trim() === state.selectedCategory) {
              // 展开父级元素
              const parentItem = link.closest('.category-list-item');
              if (parentItem) {
                parentItem.classList.add('active');
              }
              // 高亮当前分类
              link.classList.add('active');
            }
          });
        }
      }
    }
  }

};

// 初始化事件监听
document.addEventListener('DOMContentLoaded', function() {
  // 初始化分类管理器
  Fluid.utils.categoryManager.init();

  // 恢复状态
  Fluid.utils.stateManager.restoreState();

  // 添加页面卸载前的状态保存
  window.addEventListener('beforeunload', function() {
    Fluid.utils.stateManager.saveState();
  });

  // 添加滚动防抖
  let scrollTimer;
  window.addEventListener('scroll', function() {
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }
    scrollTimer = setTimeout(function() {
      Fluid.utils.stateManager.saveState();
    }, 150);
  }, { passive: true });
});

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
