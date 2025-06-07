$(document).ready(function(){
  $(".pro_f_title").click(function(){
    $(this).find("span").toggleClass('active');
    $(this).parent().find(".pro_f_content").slideToggle();
  });
  $(".proImgSwiper .swiper-slide").mouseenter(function(){
    $(".proImgSwiper .swiper-slide").removeClass("active");
    $(this).addClass("active");			
  });
  $(".product-gallery-shane__carousel-item .aspect-ratio>img").click(function(){
    var zoom_url = $(this).attr("src");
    $(".product-block-list-shane__wrapper .shane-product-zoomimg").css("display","flex");
    $(".product-block-list-shane__wrapper .shane-product-zoomimg>img").attr("src",zoom_url)
  });
  $(".product-block-list-shane__wrapper .shane-product-zoomimg .close-zoomimg").click(function(){
    $(".product-block-list-shane__wrapper .shane-product-zoomimg").css("display","none");
  });
});