;(function (window) {
  //定义常量，保存状态
  //初始状态
  const PENDING = 'pending'
  // 成功状态
  const RESOLVED = 'resolved'
  // 失败状态
  const REJECTED = 'rejected'

  class Promise {
    //自定义promise
    constructor(execute) {
      //保存this的指向
      const self = this

      this.status = 'pending' //保存promise的状态，初始值为pending

      this.data = undefined //给promise对象指定一个用于存储结果数据的属性

      this.callback = [] //保存回调函数，结构为 {onResolved:function () {},onRejected:function () {}}
      //成功的函数
      function resolve(value) {
        //状态只能改变一次
        if (self.status !== PENDING) {
          return
        }
        //改变状态
        self.status = RESOLVED

        //保存数据值
        self.data = value

        //判断callback中有没有存储回调函数
        if (self.callback.length > 0) {
          //异步执行
          setTimeout(() => {
            self.callback.forEach((callbacksObj) => {
              //调用成功的回调函数
              callbacksObj.onResolved() //{onResolved:function () {},onRejected:function () {}}
            })
          })
        }
      }
      //失败的函数
      function reject(reason) {
        //状态只能改变一次
        if (self.status !== PENDING) {
          return
        }
        //改变状态
        self.status = REJECTED
        //保存数据值
        self.data = reason

        //判断callback中有没有存储回调函数
        if (self.callback.length > 0) {
          //异步执行
          setTimeout(() => {
            self.callback.forEach((callbacksObj) => {
              //调用失败的回调函数
              callbacksObj.onRejected()
            })
          })
        }
      }

      //同步调用执行器函数
      try {
        execute(resolve, reject) //执行器函数有可能抛出异常,如果抛出异常,promise的状态变为rejected
      } catch (error) {
        reject(error)
      }
    }
    //返回一个新的promise
    then(onResolved, onRejected) {
      onResolved =
        typeof onResolved === 'function' ? onResolved : (value) => value //向下传递成功的value

      //实现异常穿透的关键点 提取默认的失败的回调
      onRejected =
        typeof onRejected === 'function'
          ? onRejected
          : (reason) => {
              throw reason
            } //向后传递失败的reason

      //保存this的指向
      const self = this
      //then方法返回一个新的promise对象 执行成功或者失败的函数由上一个promise对象then方法指定回调函数执行的返回值决定
      return new Promise((resolve, reject) => {
        function handler(callback) {
          //捕获异常
          try {
            //接受函数执行的返回值
            const result = callback(self.data)
            //根据返回值进行判断
            //如果函数的返回值是一个promise
            if (result instanceof Promise) {
              // result.then((value) => {resolve(value)},(reason) => {reject(reason)})
              //优化写法 因为resolve、reject本身就是一个函数接受一个实参
              result.then(resolve, reject)
            } else {
              //成功的回调 value就是函数返回的值
              resolve(result)
            }
          } catch (error) {
            //如果程序执行异常，调用reject，状态变为rejected
            reject(error)
          }
        }

        //如果状态为pending,把回调函数保存到对象的callbacks属性中
        //格式为{onResolved:function () {},onRejected:function () {}}
        if (this.status === PENDING) {
          this.callback.push({
            onResolved() {
              handler(onResolved)
            },
            onRejected() {
              handler(onRejected)
            },
          })
        } else if (this.status === RESOLVED) {
          //如果为成功的状态 异步调用成功的函数
          setTimeout(() => {
            //新的promise执行成功的函数还是失败的函数由then中指定的回调函数的返回值决定：
            /*
             1.如果程序抛出异常，执行reject函数
             2.如果返回的是一个promise，那么执行的结果就是这个promise的结果
             3.返回的不是一个promise，那么就调用resolve函数，就是成功
             */
            handler(onResolved)
          })
        } else {
          //失败的状态
          //如果为失败的状态 异步调用失败的函数
          setTimeout(() => {
            handler(onRejected)
          })
        }
      })
    }

    //返回一个新的promise
    catch(onRejected) {
      return this.then(undefined, onRejected)
    }

    //返回一个成功的promise
    static resolve = function (value) {
      //value可能是一个普通的值，或者是一个promise
      return new Promise((resolve, reject) => {
        //如果value是一个promise，调用.then获取结果
        if (value instanceof Promise) {
          value.then(
            (value) => {
              resolve(value)
            },
            (reason) => {
              reject(reason)
            }
          )
        } else {
          //value是一个普通的值，那么就调用resolve成功函数
          resolve(value)
        }
      })
    }

    //返回一个失败的promise
    static reject = function (reason) {
      return new Promise((resolve, reject) => {
        //将promise状态变为失败
        reject(reason)
      })
    }

    static all = function (promises) {
      //创建一个数组，用来保存成功的promise
      let promiseCache = []
      //定义计数器，用来保存成功的promise的数量
      let resolveCount = 0
      //返回一个新的Promise
      return new Promise((resolve, reject) => {
        //遍历 函数形参promises  []
        promises.forEach((promise, index) => {
          Promise.resolve(promise).then(
            (value) => {
              resolveCount++ //成功的计数器+1
              //将值放入 promiseCache数组中
              promiseCache[index] = value
              if (resolveCount === promises.length) {
                resolve(promiseCache)
              }
            },
            (reason) => {
              //如果有一个失败,该promise就是失败的状态
              reject(reason)
            }
          )
        })
      })
    }

    //race方法,
    static race = function (promises) {
      //返回一个新的promise
      return new Promise((resolve, reject) => {
        //遍历promises数组 promise的状态只能修改一次,后面再调用的没有效果
        promises.forEach((promise) => {
          //遍历得到每一个promise，但是不一定全是promise，可能是一个数值，使用Promise.resolve方法进行包装
          Promise.resolve(promise).then(
            (value) => {
              resolve(value)
            },
            (reason) => {
              reject(reason)
            }
          )
        })
      })
    }

    /* 拓展方法 */
    //返回一个promise对象，在指定的时间后成功状态  (拓展方法)
    static resolveDelay = function (value, time) {
      //value可能是一个普通的值，或者是一个promise
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          //如果value是一个promise，调用.then获取结果
          if (value instanceof Promise) {
            value.then(
              (value) => {
                resolve(value)
              },
              (reason) => {
                reject(reason)
              }
            )
          } else {
            //value是一个普通的值，那么就调用resolve成功函数
            resolve(value)
          }
        }, time)
      })
    }

    //返回一个Promise,在指定的时间后失败  (拓展方法)
    static rejectDelay = function (reason, time) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(reason)
        }, time)
      })
    }
  }
  // 将方法挂在到window的Promise属性上
  window.Promise = Promise
})(window)
