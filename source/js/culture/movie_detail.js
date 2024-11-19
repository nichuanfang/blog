$(document).ready(function () {
    if (document.querySelector('#movie-detail-container')) {
        // 将10分制评分(带小数)转换为5分制评分(带小数) 并转换为星星表示
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

        // 验证 URL 是否有效
        function isValidUrl(url) {
            const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
            return pattern.test(url);
        }

        // 获取window.location.search中的tmdb_id
        const tmdb_id = new URLSearchParams(window.location.search).get('tmdb_id');

        // 从https://api.chuanfang.org/trakt/movie/{tmdb_id}获取数据
        let movieData = {};
        $.ajax({
            url: `https://api.chuanfang.org/trakt/movie/${tmdb_id}`,
            type: 'GET',
            dataType: 'json',
            async: false,
            success: function (data) {
                movieData = data.data;
            },
            error: function (error) {
                console.log(error);
            }
        });

        // 计算评分
        const stars = convertToStars(movieData.rating);
        const target_placeholder = movieData.share_link ? 'target="_blank"' : '';
        var open_link = movieData.share_link || '#';

        // 创建并设置电影详情的 HTML 结构
        const movieDetailHTML = `
      <div class="movie-detail-media">
        <a target="_blank" class="movie-detail-media-cover-link" href="https://www.themoviedb.org/movie/${movieData.movie_id}">
          <div class="movie-detail-media-cover">
            <img srcset="/img/loading.gif" lazyload src="https://image.tmdb.org/t/p/w440_and_h660_face${movieData.cover_image_url}" data-loaded="true"/>
          </div>
        </a>
        <div class="movie-detail-media-meta">
          <div class="movie-detail-media-meta-item title">
            <a class="title-link" target="_blank" href="https://www.themoviedb.org/movie/${movieData.movie_id}">${movieData.movie_name}</a>
          </div>
          <div class="movie-detail-media-meta-item">
            <span class="author">${movieData.area} ${movieData.release_year}</span>
            <span class="star-score">${stars[0]}<span class="grey-star">${stars[1]}</span></span>
            <span class="link"><a href="${open_link}" ${target_placeholder}><i class="fas fa-external-link-alt"></i>打开</a></span>
            <span class="copy"><a href="#"><i class="fas fa-copy"></i>复制</a></span>
            <span class="edit"><a href="#"><i class="fas fa-edit"></i>更新</a></span>
          </div>
          <div class="movie-detail-media-meta-item intro-title">剧情简介</div>
          <div class="movie-detail-media-meta-item intro">${movieData.movie_description}</div>
        </div>
      </div>
    `;

        // 将电影详情添加到页面中
        const movieDetailContainer = document.getElementById('movie-detail-container');
        movieDetailContainer.innerHTML = movieDetailHTML;

        document.querySelectorAll('img[lazyload]').forEach(each => {
            Fluid.utils.waitElementVisible(each, () => {
                each.removeAttribute('srcset');
                each.removeAttribute('lazyload');
            }, CONFIG.lazyload.offset_factor);
        });

        // 获取 open_link 元素
        const openLinkElement = document.querySelector('.link a');

        // 处理复制
        const copyButton = document.querySelector('.movie-detail-media-meta-item .copy a');
        if (openLinkElement.getAttribute('href') == '#') {
            copyButton.classList.add('disabled');
            openLinkElement.classList.add('disabled');
            copyButton.style.color = '#999';
            openLinkElement.style.color = '#999';
        }

        let isCopyInProgress = false;
        let copyTimer;

        copyButton.addEventListener('click', async (event) => {
            event.preventDefault();
            if (open_link != '#') {
                try {
                    if (isCopyInProgress) return;
                    await navigator.clipboard.writeText(open_link);
                    clearTimeout(copyTimer);
                    const originalButtonText = copyButton.innerHTML;
                    copyButton.innerHTML = '已复制<i class="fas fa-check"></i>';
                    copyButton.style.color = 'green';
                    isCopyInProgress = true;
                    copyTimer = setTimeout(() => {
                        copyButton.innerHTML = originalButtonText;
                        copyButton.style.color = '';
                        isCopyInProgress = false;
                    }, 1000);
                } catch (err) {
                    console.error('复制到剪贴板失败:', err);
                }
            }
        });

        const editButton = document.querySelector('.movie-detail-media-meta-item .edit a');
        editButton.addEventListener('click', (event) => {
            event.preventDefault();
            const inputBox = document.createElement('div');
            inputBox.className = 'input-box';
            inputBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #607D8B;
        padding: 20px;
        border: 1px solid #212529;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        width: 400px;
      `;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '请输入URL';
            input.style.cssText = 'width: 100%; margin-bottom: 10px;';
            inputBox.appendChild(input);

            const confirmButton = document.createElement('button');
            confirmButton.textContent = '确认';
            confirmButton.style.float = 'right';
            inputBox.appendChild(confirmButton);

            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.style.cssText = 'float: right; margin-right: 10px;';
            inputBox.appendChild(cancelButton);

            document.body.appendChild(inputBox);
            input.focus();

            confirmButton.addEventListener('click', () => {
                const url = input.value;
                if (!isValidUrl(url)) {
                    input.placeholder = 'URL无效!';
                    input.value = '';
                    input.focus();
                } else {
                    $.ajax({
                        url: 'https://api.chuanfang.org/trakt/update_movie_share_link',
                        type: 'POST',
                        dataType: 'json',
                        data: {
                            movie_id: movieData.movie_id,
                            share_link: url,
                        },
                        success: function (data) {
                            if (data.code == 200) {
                                const originalButtonText = editButton.innerHTML;
                                editButton.innerHTML = '已更新 <i class="fas fa-check"></i>';
                                editButton.style.color = 'green';
                                setTimeout(() => {
                                    editButton.innerHTML = originalButtonText;
                                    editButton.style.color = '';
                                }, 1000);
                                if (inputBox && inputBox.parentNode) {
                                    inputBox.parentNode.removeChild(inputBox);
                                }
                                openLinkElement.setAttribute('href', url);
                                openLinkElement.classList.remove('disabled');
                                openLinkElement.style.color = '';
                                openLinkElement.setAttribute('target', '_blank');
                                copyButton.classList.remove('disabled');
                                copyButton.style.color = '';
                                open_link = url;
                            } else {
                                input.placeholder = '更新失败!';
                                input.value = '';
                                input.focus();
                            }
                        },
                        error: function (error) {
                            console.log(error);
                        }
                    });
                }
            });

            cancelButton.addEventListener('click', () => {
                document.body.removeChild(inputBox);
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    confirmButton.click();
                    event.preventDefault();
                }
            });
        });
    }
});
