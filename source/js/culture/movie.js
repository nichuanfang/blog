$(document).ready(function () {
  if (document.querySelector('.movie-culture-list')) {
    const MovieManager = {
      config: {
        scrollInterval: 300,
        scrollThreshold: 200,
        itemsPerPage: 12,
        jsonSrc: 'https://api.chuanfang.org/trakt/movie',
        coverSrc: 'https://image.tmdb.org/t/p/w116_and_h174_face',
        scrollRestoreTimeout: 24 * 60 * 60 * 1000 // 24小时
      },

      state: {
        currentPage: 1,
        isLoading: false,
        dataEnded: false,
        loadedItemsCount: 0,
        lastScrollPosition: 0,
        restoredPosition: null,
        scrollTimer: null
      },

      elements: {
        cultureList: document.querySelector('.movie-culture-list'),
        loadingElement: document.getElementById('loading')
      },

      init() {
        this.setupScrollRestoreStyles();
        this.createScrollRestoreIndicator();
        this.setupEventListeners();
        this.loadInitialData();
      },

      // 添加必要的样式
      setupScrollRestoreStyles() {
        const style = document.createElement('style');
        style.textContent = `
          .scroll-restore-indicator {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .scroll-restore-indicator.visible {
            opacity: 1;
            visibility: visible;
          }
          
          .scroll-restore-indicator .loading-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      },

      createScrollRestoreIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'scroll-restore-indicator';
        indicator.innerHTML = `
          <div class="loading-spinner"></div>
          <span>正在恢复浏览位置...</span>
        `;
        document.body.appendChild(indicator);
        this.elements.scrollRestoreIndicator = indicator;
      },

      setupEventListeners() {
        // 滚动事件监听（使用节流优化）
        window.addEventListener('scroll', this.throttle(() => {
          if (this.state.dataEnded || this.state.isLoading) return;

          const distanceToBottom = document.documentElement.scrollHeight -
                                 window.innerHeight - window.scrollY;

          if (distanceToBottom <= this.config.scrollThreshold) {
            clearTimeout(this.state.scrollTimer);
            this.state.scrollTimer = setTimeout(() => {
              this.loadMoreData();
            }, this.config.scrollInterval);
          }

          // 使用防抖保存滚动位置
          this.debounce(() => this.saveScrollPosition(), 150)();
        }, 100));

        // 页面可见性变化监听
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.restoreScrollPosition();
          }
        });

        // 页面卸载前保存位置
        window.addEventListener('beforeunload', () => {
          this.saveScrollPosition();
        });
      },

      // 防抖函数
      debounce(func, wait) {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      },

      // 节流函数
      throttle(func, limit) {
        let inThrottle;
        return (...args) => {
          if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        };
      },

      async loadInitialData() {
        const savedData = sessionStorage.getItem('movie_init_data');
        if (savedData) {
          sessionStorage.removeItem('movie_init_data');
          await this.processInitialData(JSON.parse(savedData));
        } else {
          await this.fetchData(this.state.currentPage);
        }
        // 初始数据加载完成后恢复滚动位置
        this.restoreScrollPosition();
      },

      async processInitialData(data) {
        if (data['data']['data'].length === 0) {
          this.state.dataEnded = true;
        } else {
          await this.generateMovieElements(data);
        }
      },

      async loadMoreData() {
        if (this.state.isLoading || this.state.dataEnded) return;
        this.state.currentPage++;
        await this.fetchData(this.state.currentPage);
      },

      async fetchData(page) {
        this.showLoading();
        this.state.isLoading = true;

        try {
          const response = await fetch(
            `${this.config.jsonSrc}?page=${page}&page_size=${this.config.itemsPerPage}`
          );
          const data = await response.json();

          if (data['data']['data'].length === 0) {
            this.state.dataEnded = true;
          } else {
            await this.generateMovieElements(data);
          }
        } catch (error) {
          console.error('Error fetching movies:', error);
        } finally {
          this.hideLoading();
          this.state.isLoading = false;
        }
      },

      showLoading() {
        this.elements.loadingElement.style.display = 'block';
      },

      hideLoading() {
        this.elements.loadingElement.style.display = 'none';
      },

      convertToStars(rating) {
        let num = parseFloat(rating) / 2;
        if (num > 4.3) num = 5;
        const fullStar = parseInt(num);
        const halfStar = num - fullStar;
        const noStar = 5 - fullStar - Math.ceil(halfStar);
        return [
          '★'.repeat(fullStar) + '☆'.repeat(halfStar),
          '☆'.repeat(noStar)
        ];
      },

      async generateMovieElements(data) {
        const jsonData = data['data']['data'];
        const fragment = document.createDocumentFragment();

        jsonData.forEach(item => {
          const media = this.createMovieElement(item);
          fragment.appendChild(media);
          this.state.loadedItemsCount++;
        });

        this.elements.cultureList.appendChild(fragment);
        this.initializeLazyLoading();
      },

      createMovieElement(item) {
        const media = document.createElement('div');
        media.classList.add('media');
        if (item.share_link === '') media.style.opacity = '0.5';

        // 添加数据属性用于定位
        media.dataset.movieId = item.movie_id;
        media.dataset.index = this.state.loadedItemsCount;

        const mediaCover = this.createMovieCover(item);
        const mediaMeta = this.createMovieMeta(item);

        media.appendChild(mediaCover);
        media.appendChild(mediaMeta);

        return media;
      },

      createMovieCover(item) {
        const mediaCover = document.createElement('div');
        mediaCover.classList.add('media-cover');

        const img = document.createElement('img');
        img.setAttribute('src', this.config.coverSrc + item.cover_image_url);
        img.setAttribute('data-src', this.config.coverSrc + item.cover_image_url);
        img.setAttribute('data-loaded', 'true');
        img.setAttribute('lazyload', '');
        img.setAttribute('srcset', '/img/loading.gif');

        const mediaCoverLink = document.createElement('a');
        mediaCoverLink.setAttribute('target', '_blank');
        mediaCoverLink.classList.add('media-cover-link');
        mediaCoverLink.setAttribute('href', `/culture/movies/detail/?tmdb_id=${item.movie_id}`);

        mediaCoverLink.appendChild(img);
        mediaCover.appendChild(mediaCoverLink);

        return mediaCover;
      },

      createMovieMeta(item) {
        const mediaMeta = document.createElement('div');
        mediaMeta.classList.add('media-meta');

        // 标题
        const title = document.createElement('div');
        title.classList.add('media-meta-item', 'title');
        const titleLink = document.createElement('a');
        titleLink.classList.add('title-link');
        titleLink.setAttribute('target', '_blank');
        titleLink.setAttribute('href', `/culture/movies/detail/?tmdb_id=${item.movie_id}`);
        titleLink.textContent = item.movie_name;
        title.appendChild(titleLink);

        // 元信息
        const meta = document.createElement('div');
        meta.classList.add('media-meta-item');
        const authorSpan = document.createElement('span');
        authorSpan.classList.add('author');
        authorSpan.textContent = `${item.area} ${item.release_year}`;
        meta.appendChild(authorSpan);

        // 评分
        const starScoreSpan = document.createElement('span');
        starScoreSpan.classList.add('star-score');
        const [star, grey_star] = this.convertToStars(item.rating);
        starScoreSpan.textContent = star;
        const grey_starSpan = document.createElement('span');
        grey_starSpan.classList.add('grey-star');
        grey_starSpan.textContent = grey_star;
        starScoreSpan.appendChild(grey_starSpan);
        meta.appendChild(starScoreSpan);

        // 简介
        const intro = document.createElement('div');
        intro.classList.add('media-meta-item', 'intro');
        intro.textContent = item.movie_description;

        mediaMeta.appendChild(title);
        mediaMeta.appendChild(meta);
        mediaMeta.appendChild(intro);

        return mediaMeta;
      },

      initializeLazyLoading() {
        document.querySelectorAll('img[lazyload]').forEach(each => {
          Fluid.utils.waitElementVisible(each, () => {
            each.removeAttribute('srcset');
            each.removeAttribute('lazyload');
          }, CONFIG.lazyload.offset_factor);
        });
      },

      saveScrollPosition() {
        const scrollData = {
          position: window.scrollY,
          timestamp: Date.now(),
          loadedItems: this.state.loadedItemsCount,
          currentPage: this.state.currentPage
        };
        localStorage.setItem(
          `movie_scroll_${window.location.pathname}`,
          JSON.stringify(scrollData)
        );
      },

      async restoreScrollPosition() {
        const scrollStr = localStorage.getItem(`movie_scroll_${window.location.pathname}`);
        if (!scrollStr) return;

        try {
          const scrollData = JSON.parse(scrollStr);
          if (Date.now() - scrollData.timestamp > this.config.scrollRestoreTimeout) {
            localStorage.removeItem(`movie_scroll_${window.location.pathname}`);
            return;
          }

          // 如果需要恢复的位置大于当前加载的内容高度
          if (scrollData.currentPage > this.state.currentPage) {
            this.elements.scrollRestoreIndicator.classList.add('visible');

            // 加载到之前的页数
            while (this.state.currentPage < scrollData.currentPage && !this.state.dataEnded) {
              await this.loadMoreData();
            }
          }

          // 使用 requestAnimationFrame 确保内容已渲染
          requestAnimationFrame(() => {
            window.scrollTo({
              top: scrollData.position,
              behavior: 'instant'
            });

            // 延迟隐藏指示器
            setTimeout(() => {
              this.elements.scrollRestoreIndicator.classList.remove('visible');
            }, 500);
          });
        } catch (e) {
          console.error('Error restoring scroll position:', e);
          localStorage.removeItem(`movie_scroll_${window.location.pathname}`);
        }
      },

      // 清理过期的滚动数据
      cleanupScrollData() {
        const keys = Object.keys(localStorage);
        const scrollKeys = keys.filter(key => key.startsWith('movie_scroll_'));
        const now = Date.now();

        scrollKeys.forEach(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (now - data.timestamp > this.config.scrollRestoreTimeout) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        });
      }
    };

    // 初始化
    MovieManager.init();

    // 定期清理过期数据
    setInterval(() => MovieManager.cleanupScrollData(), 24 * 60 * 60 * 1000);
  }
});