    var cartService, controller, data, productService;
    cartService = (() => {
        var cartChannel, cart, totals, updateTotals;
        cart = {
            store: [],
            totals: {
                subTotal: 0,
                get tax() {
                    return cart.totals.subTotal * .05;
                },
                get total() {
                    return cart.totals.subTotal + cart.totals.tax;
                }
            }
        };
        cartChannel = postal.channel('cart');
        // pickup any request for cart items
        cartChannel.subscribe('get.request', (crit, env) => {
            cartChannel.publish('get.response', store);
        });
        cartChannel.subscribe('add.request', (item, env) => {
            var existentItem = _.find(cart.store, (cartitem) => { return item.id === cartitem.id });
            if(existentItem) {
                existentItem.quantity++;
            } else {
                item.quantity = 1;
                cart.store.push(item);
            }
            updateTotals();
            cartChannel.publish('add.response', cart);
        });
        cartChannel.subscribe('remove.request', (item, env) => {
            var existentItem = _.find(cart.store, item);
            if(existentItem && existentItem.quantity > 1) {
                existentItem.quantity--;
            } else {
                _.remove(cart.store, item);
            }
            updateTotals();
            cartChannel.publish('remove.response', cart);
        });

        updateTotals = function() {
            var result = 0;
            _.each(cart.store, (item) => result += (item.price * item.quantity));
            cart.totals.subTotal = result;
        };
        return {
            get: function(crit = {}) {
                postal.channel('cart').publish('get.request', crit);
            },
            add: function(item) {
                postal.channel('cart').publish('add.request', item);
            },
            remove: function(item) {
                postal.channel('cart').publish('remove.request', item);
            }
        };
    })();

    productService = (() => {
        var store =  _.map([
                {
                    title: 'teakettle',
                    price: 14.95
                },
                {
                    title: 'lollipop',
                    price: 0.5
                },
                {
                    title: 'magic stick',
                    price: 89.12546
                },
                {
                    title: 'low rider',
                    price: 22450
                },
                {
                    title: 'champagne',
                    price: 45
                }
            ],
        (item, i) => { 
            item.id = i; 
            return item;
        });
        // pickup any request for cart items
        postal.channel('product').subscribe('get.request', (crit, env) => {
            postal.channel('product').publish('get.response', store);
        });

        return {
            get: function(crit = {}) {
                postal.channel('product').publish('get.request', crit);
            }
        };
    })();
 data = {
    title: 'Welcome',
    products: [],
    bag: [],
    
    subtotal: 0,
    
    tax: 0,
    
    total: 0     
 };
  
  controller = {
    onAtbClick: function(e, model) {
        cartService.add(model.data.products[model.index]);
    },
    
    addItem: function(e, model) {
      cartService.add(model.data.bag[model.index]);
    },
    getActualModel: function(model) {
        return model.data.products[model.index];
    },
    removeItem: function(e, model) {
        cartService.remove(model.data.bag[model.index]);
    }
    
  };

// subscriptions for controller
postal.channel('cart').subscribe('*.response', (cart, env) => {
    // clear it
    data.bag.splice(0, data.bag.length);
   // repopulate without changing the reference -- rivets won't pickup on it changes like data.bag = x, you have to repopulate the original array
   _.each(cart.store, (item) => data.bag.push(item));
   // same thing here, replace each value
   data.subtotal = cart.totals.subTotal;
   data.tax = cart.totals.tax;
   data.total = cart.totals.total;
});




rivets.formatters.price = function(val) {
  
  var spl = String(val).split('.'),
    dollarsArray = spl[0].split(''),
    lastDollar = dollarsArray.length - 1,
    pow,
    i;
  
  if(dollarsArray.length > 3) {
    
    dollarsArray.reverse();
    
    for(i = lastDollar; i > -1; i--) {
      
      if(i % 3 === 0 && i !== 0) {
        
        dollarsArray.splice(i, 0, ',');
      }
    }
    
    spl[0] = dollarsArray.reverse().join('');
  }
  
  if(spl.length > 1) {
    
    spl[1] = spl[1].substr(0, 2);
    
    if(spl[1].length < 2) {
      
      spl[1] += '0';
    }
  }else {
    
    spl[1] = '00';
  }
  
  return '<abbr title="USD">$</abbr>' + spl.join('.');
};

rivets.formatters.length = function(val) {
  
  return val.length;
}
// listen for when the product service returns a list of products, will also work for paging
postal.channel('product').subscribe('get.response', (d, env) => {
    _.each(_.uniq(d, data.products), (p, pi) => {
        data.products.push(p);
    });
});

productService.get({});
rivets.bind($('#candy-shop'), {
  data: data,
  controller: controller
});

