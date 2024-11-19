$(document).ready(function () {
    if (document.querySelector('.show-culture-list')) {
        const scrollInterval = 300;
        const scrollThreshold = 200;
        let currentPage = 1;
        const itemsPerPage = 12;
        const jsonSrc = 'https://api.chuanfang.org/trakt/show';
        const coverSrc = 'https://image.tmdb.org/t/p/w116_and_h174_face';
        let init_data = sessionStorage.getItem('show_init_data') || '';
        sessionStorage.removeItem('show_init_data');
        let scrollTimer = null;
        let data_ended = false;
        const cultureList = document.querySelector('.show-culture-list');

        function showLoadingAnimation() {
            document.getElementById('loading').style.display = 'block';
        }

        function hideLoadingAnimation() {
            document.getElementById('loading').style.display = 'none';
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

        function fetchNextPage(currentPage, itemsPerPage) {
            const nextJsonSrc = `${jsonSrc}?page=${currentPage}&page_size=${itemsPerPage}`;
            return fetch(nextJsonSrc)
                .then(response => response.json())
                .then(data => {
                    if (data['data']['data'].length === 0) {
                        hideLoadingAnimation();
                        data_ended = true;
                    } else {
                        generateShowElements(data, coverSrc);
                        hideLoadingAnimation();
                    }
                })
                .catch(error => console.error('Error:', error));
        }

        function generateShowElements(data, coverSrc) {
            const jsonData = data['data']['data'];
            const container = document.querySelector('.show-culture-list');
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
                mediaCoverLink.setAttribute('href', `/culture/shows/detail/?tmdb_id=${item.show_id}`);
                mediaCoverLink.appendChild(mediaCover);
                media.appendChild(mediaCoverLink);

                const mediaMeta = document.createElement('div');
                mediaMeta.classList.add('media-meta');

                const title = document.createElement('div');
                title.classList.add('media-meta-item', 'title');
                const titleLink = document.createElement('a');
                titleLink.classList.add('title-link');
                titleLink.setAttribute('target', '_blank');
                titleLink.setAttribute('href', `/culture/shows/detail/?tmdb_id=${item.show_id}`);
                titleLink.textContent = item.show_name;
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
                const [stars, greyStars] = convertToStars(item.rating);
                starScoreSpan.textContent = stars;
                const greyStarSpan = document.createElement('span');
                greyStarSpan.classList.add('grey-star');
                greyStarSpan.textContent = greyStars;
                starScoreSpan.appendChild(greyStarSpan);
                meta.appendChild(starScoreSpan);
                mediaMeta.appendChild(meta);

                const intro = document.createElement('div');
                intro.classList.add('media-meta-item', 'intro');
                intro.textContent = item.show_description;
                mediaMeta.appendChild(intro);

                media.appendChild(mediaMeta);
                fragment.appendChild(media);
            });

            container.appendChild(fragment);
            document.querySelectorAll('img[lazyload]').forEach(each => {
                Fluid.utils.waitElementVisible(each, () => {
                    each.removeAttribute('srcset');
                    each.removeAttribute('lazyload');
                }, CONFIG.lazyload.offset_factor);
            });
        }

        function simulateFetch(url) {
            return new Promise((resolve, reject) => {
                setTimeout(() => resolve({data: '模拟的异步数据'}), 0);
            });
        }

        if (init_data !== '') {
            simulateFetch('https://api.example.com/data')
                .then(response => {
                    const data = JSON.parse(init_data);
                    if (data['data']['data'].length === 0) {
                        hideLoadingAnimation();
                        data_ended = true;
                    } else {
                        generateShowElements(data, coverSrc);
                    }
                })
                .catch(error => console.error('Error:', error));
        } else {
            fetchNextPage(currentPage, itemsPerPage);
        }

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
                    if (!data_ended) {
                        fetchNextPage(currentPage, itemsPerPage);
                    }
                }, scrollInterval);
            }
        });
    }
});
