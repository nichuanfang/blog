// 避免打开浏览器时 Culture 页面出现空白，先请求一次数据 建立SSL连接
// 如果SessionStorage中没有init_data且inited不存在，则初始化init_data

// 如果当前是culture/*页面 才执行以下代码
if (window.location.pathname == "/" || window.location.pathname == "/culture/") {
    const movieDataPromise = !sessionStorage.getItem("movie_init_data") ?
        fetch("https://api.chuanfang.org/trakt/movie?page=1&page_size=12").then(t => t.json()) :
        Promise.resolve(null);

    const showDataPromise = !sessionStorage.getItem("show_init_data") ?
        fetch("https://api.chuanfang.org/trakt/show?page=1&page_size=12").then(t => t.json()) :
        Promise.resolve(null);

    Promise.all([movieDataPromise, showDataPromise])
        .then(([movieData, showData]) => {
            if (movieData && movieData["data"]["data"].length != 0) {
                sessionStorage.setItem("movie_init_data", JSON.stringify(movieData));
            }
            if (showData && showData["data"]["data"].length != 0) {
                sessionStorage.setItem("show_init_data", JSON.stringify(showData));
            }
        })
        .catch(error => {
            console.error("Error:", error);
        });
}
