/* global Fluid */

$(document).ready(function () {
    if (document.querySelector('.movie-culture-list')) {
        const scrollInterval = 300;
        const scrollThreshold = 200;
        let currentPage = 1;
        const itemsPerPage = 12;
        const jsonSrc = 'https://api.chuanfang.org/trakt/movie';
        const coverSrc = 'https://image.tmdb.org/t/p/w116_and_h174_face';
        let init_data = sessionStorage.getItem('movie_init_data') || '';
        let data_ended = false;
        const cultureList = document.querySelector('.movie-culture-list');
        const loadingElement = document.getElementById('loading');

        if (init_data) {
            sessionStorage.removeItem('movie_init_data');
            processInitialData(JSON.parse(init_data));
        } else {
            fetchData(currentPage, itemsPerPage);
        }

        function showLoadingAnimation() {
            loadingElement.style.display = 'block';
        }

        function hideLoadingAnimation() {
            loadingElement.style.display = 'none';
        }

        function convertToStars(rating) {
            let num = parseFloat(rating) / 2;
            if (num > 4.3) num = 5;
            const fullStar = parseInt(num);
            const halfStar = num - fullStar;
            const noStar = 5 - fullStar - Math.ceil(halfStar);
            return [
                '★'.repeat(fullStar) + '☆'.repeat(halfStar),
                '☆'.repeat(noStar)
            ];
        }

        function fetchData(page, pageSize) {
            fetch(`${jsonSrc}?page=${page}&page_size=${pageSize}`)
                .then(response => response.json())
                .then(data => {
                    if (data['data']['data'].length === 0) {
                        hideLoadingAnimation();
                        data_ended = true;
                    } else {
                        generateMovieElements(data, coverSrc);
                        hideLoadingAnimation();
                    }
                })
                .catch(error => console.error('Error:', error));
        }

        function generateMovieElements(data, coverSrc) {
            const jsonData = data['data']['data'];
            const fragment = document.createDocumentFragment();

            jsonData.forEach(item => {
                const media = document.createElement('div');
                media.classList.add('media');
                if (item.share_link === '') media.style.opacity = '0.5';

                const mediaCover = document.createElement('div');
                mediaCover.classList.add('media-cover');
                const img = document.createElement('img');
                img.setAttribute('src', coverSrc + item.cover_image_url);
                img.setAttribute('data-src', coverSrc + item.cover_image_url);
                img.setAttribute('data-loaded', 'true');
                img.setAttribute('lazyload', '');
                img.setAttribute('srcset', '/img/loading.gif');
                mediaCover.appendChild(img);

                const mediaCoverLink = document.createElement('a');
                mediaCoverLink.setAttribute('target', '_blank');
                mediaCoverLink.classList.add('media-cover-link');
                mediaCoverLink.setAttribute('href', `/culture/movies/detail/?tmdb_id=${item.movie_id}`);
                mediaCoverLink.appendChild(mediaCover);

                media.appendChild(mediaCoverLink);

                const mediaMeta = document.createElement('div');
                mediaMeta.classList.add('media-meta');

                const title = document.createElement('div');
                title.classList.add('media-meta-item', 'title');
                const titleLink = document.createElement('a');
                titleLink.classList.add('title-link');
                titleLink.setAttribute('target', '_blank');
                titleLink.setAttribute('href', `/culture/movies/detail/?tmdb_id=${item.movie_id}`);
                titleLink.textContent = item.movie_name;
                title.appendChild(titleLink);
                mediaMeta.appendChild(title);

                const meta = document.createElement('div');
                meta.classList.add('media-meta-item');
                const authorSpan = document.createElement('span');
                authorSpan.classList.add('author');
                authorSpan.textContent = `${item.area} ${item.release_year}`;
                meta.appendChild(authorSpan);

                const starScoreSpan = document.createElement('span');
                starScoreSpan.classList.add('star-score');
                const [star, grey_star] = convertToStars(item.rating);
                starScoreSpan.textContent = star;
                const grey_starSpan = document.createElement('span');
                grey_starSpan.classList.add('grey-star');
                grey_starSpan.textContent = grey_star;
                starScoreSpan.appendChild(grey_starSpan);
                meta.appendChild(starScoreSpan);

                mediaMeta.appendChild(meta);

                const intro = document.createElement('div');
                intro.classList.add('media-meta-item', 'intro');
                intro.textContent = item.movie_description;
                mediaMeta.appendChild(intro);

                media.appendChild(mediaMeta);
                fragment.appendChild(media);
            });

            cultureList.appendChild(fragment);
            document.querySelectorAll('img[lazyload]').forEach(each => {
                Fluid.utils.waitElementVisible(each, () => {
                    each.removeAttribute('srcset');
                    each.removeAttribute('lazyload');
                }, CONFIG.lazyload.offset_factor);
            });
        }

        function processInitialData(data) {
            if (data['data']['data'].length === 0) {
                hideLoadingAnimation();
                data_ended = true;
            } else {
                generateMovieElements(data, coverSrc);
            }
        }

        let scrollTimer = null;
        window.addEventListener('scroll', () => {
            if (data_ended) {
                hideLoadingAnimation();
                return;
            }
            clearTimeout(scrollTimer);
            const distanceToBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
            if (distanceToBottom <= scrollThreshold) {
                showLoadingAnimation();
                scrollTimer = setTimeout(() => {
                    currentPage++;
                    if (!data_ended) fetchData(currentPage, itemsPerPage);
                }, scrollInterval);
            }
        });

        // 使用 MutationObserver 监听内容变化
        const observer = new MutationObserver(() => {
            // 检查是否需要恢复滚动位置
            const scrollData = sessionStorage.getItem('fluid_scroll_position');
            if (scrollData) {
                const { position } = JSON.parse(scrollData);
                if (document.documentElement.scrollHeight > position) {
                    window.scrollTo(0, position);
                    sessionStorage.removeItem('fluid_scroll_position');
                }
            }
        });

        // 观察电影列表容器的变化
        observer.observe(cultureList, {
            childList: true,
            subtree: true
        });

        // 页面卸载前保存滚动位置
        window.addEventListener('beforeunload', () => {
            const scrollData = {
                position: window.scrollY,
                timestamp: Date.now()
            };
            sessionStorage.setItem('fluid_scroll_position', JSON.stringify(scrollData));
        });
    }
});