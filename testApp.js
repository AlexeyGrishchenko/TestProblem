var app = angular.module("vkApp", [])
    /*.directive('clear', [ function () {
      return {
        link: function (scope, elem, attr) {
          var i = scope.$index + 1;
          if(!(i % 2)) {
            angular.element(elem).after('<div class="clearfix visible-sm"></div>');
          }
          if(!(i % 3)) {
            angular.element(elem).after('<div class="clearfix visible-md"></div>');
          }
          if(!(i % 4)) {
            angular.element(elem).after('<div class="clearfix visible-lg"></div>');
          }
        }
      };
    }])*/
    .factory("vkApiService", function ($http, $q) {

      return {
        getVKWallData: function(domain, count, offset) {
          var url = "https://api.vk.com/method/wall.get?domain=" + domain + "&count=" + count + "&offset=" + offset + "&callback=JSON_CALLBACK";
          var promise = $http.jsonp(url);
          return promise;
        },

        getVKWallAllData: function(domain, count, offset) {
          var promises = [];
          var off = offset;

            while (count > 0) {
              promises.push(this.getVKWallData(domain, count, off));
              count -= 100;
              off += 100;
            }

          return $q.all(promises);
        }
      };
    })
    .factory("paginationService", function($sce) {
      var currPage = 0;
      var itemsPerPage = 12;
      var items = [];

      return {
        setItems: function (newItems) {
          items = newItems;
        },

        getPageItems: function (numPage) {
          var numPage = angular.isDefined(numPage)? numPage:0;
          var start = itemsPerPage * numPage;
          var end = start + itemsPerPage;

          currPage = numPage;
          end = end > items.length?items.length:end;
          return items.slice(start, end);
        },

        getNumPages: function(){
          return Math.ceil(items.length / itemsPerPage);
        },

        getPagArray: function() {
          var numPage = this.getNumPages();
          var pagArray = [];
          pagArray.push({
            name: $sce.trustAsHtml("&laquo"),
            link: "prev"
          });
          for (var i = 0; i < numPage; i++){
            var index = i + 1;
            pagArray.push({
              name: $sce.trustAsHtml(String(index)),
              link: i
            });
          }
          pagArray.push({
            name: $sce.trustAsHtml("&raquo"),
            link: "next"
          });

          if (numPage > 1) {
            return pagArray;
          } else {
            return false;
          }
        },

        getCurrPageNum: function() {
          return currPage;
        },

        getPrevPage: function() {
          var prevPage = currPage - 1;
          if (prevPage < 0) {
            prevPage = 0;
          }
          return this.getPageItems(prevPage);
        },

        getNextPage: function() {
          var nextPage = currPage + 1;
          var pages = this.getNumPages();
          if (nextPage >= pages) {
            nextPage = pages - 1;
          }
          return this.getPageItems(nextPage);
        }
      }
    })
    .controller("vkCtrl", ["$scope", "vkApiService", "paginationService", function($scope, vkApiService, paginationService){
        $scope.newitems = [];
        $scope.new = {domain: "extrawebdev",
                      count: 24,
                      offset: 0};


        $scope.getInputFormError = function (error) {
            if (angular.isDefined(error)) {
                if (error.required) {
                    return "Поле не должно быть пустым";
                }
            }
        };

        $scope.messageDomain = function() {
          return "Введите сокращенное имя пользователя или сообщества";
        };

        $scope.messageCount = function () {
          return "Введите количество записей для загрузки";
        };

        $scope.getWall = function (domain, count, offset) {
          $scope.changePromisesArray(domain, count, offset);
        };

        $scope.getPage = function(numPage) {
          if (numPage === "prev") {
            $scope.newitems = paginationService.getPrevPage();
          } else if (numPage === "next") {
            $scope.newitems = paginationService.getNextPage();
          } else {
            $scope.newitems = paginationService.getPageItems(numPage);
          }
        };

        $scope.getCurrPageNum = function() {
          return paginationService.getCurrPageNum();
        };

        $scope.changePromisesArray = function(d, c, o) {
          vkApiService.getVKWallAllData(d, c, o).then(function(response) {
            if (angular.isDefined(response)) {
              $scope.items = response.reduce(function(result, current) {
                return result.concat(current.data.response.slice(1));
              }, []);
              $scope.items = changeArray($scope.items);
              paginationService.setItems($scope.items);
              $scope.newitems = paginationService.getPageItems();
              $scope.pagArray = paginationService.getPagArray();
            }
          });
        }

        $scope.delete = function() {
          $scope.newitems = [];
          $scope.pagArray = [];
        }



// вспомогательные функции


        function changeArray(array) {
          var items = [];
          array.forEach(function(item){
            var obj = {};
            if (angular.isDefined(item.attachment)){
              switch (item.attachment.type) {
                case "photo":
                  obj = convertPhotoItem(item);
                  break;
                case "link":
                  obj = convertLinkItem(item);
                  break;
                case "video":
                  obj = convertVideoItem(item);
                  break;
                case "doc":
                  obj = convertDocItem(item);
                  break;
                default:
              }
            }
            items.push(obj);
          });
          return items;

        }

        function convertPhotoItem(elem) {
          var obj = {
                  header: searchHeader(elem.text),
                  url: searchUrl(elem.text),
                  image: elem.attachment.photo.src,
                  date: elem.date * 1000
                };
          if (angular.isDefined(elem.attachments) && elem.attachments[elem.attachments.length - 1].type === "link") {
            obj.header = elem.attachments[elem.attachments.length - 1].link.title;
            obj.url = elem.attachments[elem.attachments.length - 1].link.url;
          }
          return obj;
        }

        function convertLinkItem(elem) {
          var obj = {
                  header: searchHeader(elem.text),
                  url: searchUrl(elem.text),
                  image: elem.attachment.link.image_src,
                  date: elem.date * 1000
                };
          if (angular.isDefined(elem.attachments) && elem.attachments[elem.attachments.length - 1].type === "link") {
            obj.header = elem.attachments[elem.attachments.length - 1].link.title;
            obj.url = elem.attachments[elem.attachments.length - 1].link.url;
          }
          return obj;
        }

        function convertVideoItem(elem) {
          var obj = {
                  header: searchHeader(elem.text),
                  url: null,
                  image: elem.attachment.video.image,
                  date: elem.date * 1000
                };
          if (angular.isDefined(elem.attachments) && elem.attachments[elem.attachments.length - 1].type === "link") {
            obj.header = elem.attachments[elem.attachments.length - 1].link.title;
            obj.url = elem.attachments[elem.attachments.length - 1].link.url;
          }
          return obj;
        }

        function convertDocItem(elem) {
          var obj = {
                  header: searchHeader(elem.text),
                  url: searchUrl(elem.text),
                  image: elem.attachment.doc.thumb,
                  date: elem.date * 1000
                };
          if (angular.isDefined(elem.attachments) && elem.attachments[elem.attachments.length - 1].type === "link") {
            obj.header = elem.attachments[elem.attachments.length - 1].link.title;
            obj.url = elem.attachments[elem.attachments.length - 1].link.url;
          }
          return obj;
        }


        function searchHeader(str) {
          var reg = /http/;
          var pos = str.search(reg) > 0? str.search(reg):str.length;
          var string = str.slice(0, pos).replace(/<br>/g, "");
          return cutText(string, 100);
        }

        function searchUrl(str) {
          var reg = /http/;
          var startPos = str.search(reg);
          var endPos = str.indexOf("<br>", startPos);
          var string = str.slice(startPos, endPos);
          return string;
        }

        function cutText(text, lim) {
          if (text.length <= lim) {
            return text;
          }
          text = text.slice(0, lim + 1);
          var lastBlank = text.lastIndexOf(" ");
          if (lastBlank > 0) {
            return text.slice(0, lastBlank) + "...";
          }
        }

    }])
