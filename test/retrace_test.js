/* globals Retrace, Q, Tautologistics, document */
describe('retrace', function(){

  var Parser, Promise,r;
  var current = 
    '<div>'+
      '<h1></h1>' +
      '<h2></h2>' +
      '<h3><em></em></h3>' +
      '<h4></h4>' +
    '</div>'
    ;


  var getRetrace = function(html, debug) {
    document.body.innerHTML = html;    
    Parser = Tautologistics.NodeHtmlParser;
    Promise = Q;

    return new Retrace(Parser, Promise, document.body, debug);
  };

  beforeEach(function(){
    r = getRetrace(current);
  });

  it('construct()', function(){
    Retrace.should.be.an.instanceOf(Function);

    r.handler.should.be.an.instanceOf(Parser.DefaultHandler);
    r.parser.should.be.an.instanceOf(Parser.Parser);

  });

  it('parse()', function(done){

    r.parse('<div>1</div>').then(function(dom1){

      //called once
      dom1.should.be.an.instanceOf(Object);
      r.rhs.should.equal(dom1);
      r.rhs[0].children.length.should.equal(1);
      r.lhs.should.not.have.property('children');

      //call twice
      r.parse('<div></div><div></div>').then(function(dom2){
      
        r.rhs.should.equal(dom2);
        r.rhs.length.should.equal(2);
        r.lhs.should.equal(dom1);
        
        r.parse('<div></div><li></li>').then(function(dom3){
          r.rhs.should.equal(dom3);
          r.lhs.should.equal(dom2);
          done();
        });
      
      });

    });    

  });


  describe('Add / Remove elements', function(){

    it('add one', function(done){

      var n = 
      '<div>'+
        '<h1></h1>' +
        '<h2></h2>' +
        '<h3></h3>' +
        '<h5><p></p></h5>' +
        '<h4></h4>' +
      '</div>'
      ; 

      r.parse(n).done(function(dom){

        var cs = r.compare();
        var res = cs.all();

        cs.apply();
        document.body.innerHTML.should.equal(n);
        
        done();

      });

    });


    it('nest another', function(done){

      var n = 
      '<div>'+
        '<h1></h1>' +
        '<h2></h2>' +
        '<h3><em><b></b><i></i></em></h3>' +
        '<h4></h4>' +
      '</div>'
      ; 

      r.parse(n).done(function(dom){

        r.compare().apply();
        document.body.innerHTML.should.equal(n);

        done();
      });

    });

    it('nest another 3lvs deep', function(done){

      var o = 
      '<div>'+
        '<h1></h1>' +
        '<h2></h2>' +
        '<h3><em><b></b></em></h3>' +
        '<h4></h4>' +
      '</div>'
      ;  

      var n = 
      '<div>'+
        '<h1></h1>' +
        '<h2></h2>' +
        '<h3><em><b><i></i></b></em></h3>' +
        '<h4></h4>' +
      '</div>'
      ; 

      r = getRetrace(o);
      r.parse(n).done(function(dom){
        r.compare().apply();
        document.body.innerHTML.should.equal(n);
        done();
      });

    });

    it('delete text & multiple levels deep', function(done){

      var o = 
      '<div>'+
        '<h1>test</h1>' +
        '<h2></h2>' +
        '<h3><em><b></b><i></i></em></h3>' +
        '<h4></h4>' +
      '</div>'
      ;  

      var n = 
      '<div>'+
        '<h1></h1>' +
        '<h2></h2>' +
        '<h3><em></em></h3>' +
        '<h4></h4>' +
      '</div>'
      ; 

      r = getRetrace(o);
      r.parse(n).done(function(dom){
        r.compare().apply();
        document.body.innerHTML.should.equal(n);


        done();
      });

    });

    it('edit text', function(done){

      var o = 
      '<div>'+
        '<h1>test</h1>' +
      '</div>'
      ;  

      var n = 
      '<div>'+
        '<h1>test2</h1>' +
      '</div>'
      ; 

      r = getRetrace(o);
      r.parse(n).done(function(dom){
        r.compare().apply();

        document.body.innerHTML.should.equal(n);
        done();
      });

    });
  });





  describe('Add / Remove attributes', function(){

    it('add all one', function(done){
      
      var o = 
      '<div>'+
        '<h1></h1>' +
      '</div>'
      ;       

      var n = 
      '<div>'+
        '<h1 class="hide"></h1>' +
      '</div>'
      ; 

      r = getRetrace(o);
      r.parse(n).done(function(dom){
        r.compare().apply();
        document.body.innerHTML.should.equal(n);
        done();
      });

    });

    it('add all one', function(done){
      
      var o = 
      '<div>'+
        '<h1 class="hide"></h1>' +
      '</div>'
      ;       

      var n = 
      '<div>'+
        '<h1 class="hide" id="test"></h1>' +
      '</div>'
      ; 

      r = getRetrace(o);
      r.parse(n).done(function(dom){
        r.compare().apply();
        document.body.innerHTML.should.equal(n);
        done();
      });

    });


    it('remove one', function(done){
      var o = 
      '<div>'+
        '<h1 class="hide" id="test"></h1>' +
      '</div>'
      ;       

      var n = 
      '<div>'+
        '<h1 class="hide"></h1>' +
      '</div>'
      ; 

      r = getRetrace(o);
      r.parse(n).done(function(dom){
        r.compare().apply();
        document.body.innerHTML.should.equal(n);
        done();
      });
    });

    it('remove all', function(done){
      var o = 
      '<div>'+
        '<h1 class="hide" id="test"></h1>' +
      '</div>'
      ;       

      var n = 
      '<div>'+
        '<h1></h1>' +
      '</div>'
      ; 

      r = getRetrace(o);
      r.parse(n).done(function(dom){
        r.compare().apply();
        document.body.innerHTML.should.equal(n);
        done();
      });
    });

  });

  describe('Complex', function(){

  it('remove major parts', function(done){
      var o = 
        '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
          '<div class="container">' +
            '<div class="navbar-header">' +
              '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">' +
                '<span class="sr-only">Toggle navigation</span>' +
                '<span class="icon-bar"></span>' +
                '<span class="icon-bar"></span>' +
                '<span class="icon-bar"></span>' +
              '</button>' +
              '<a class="navbar-brand" href="#">Project name</a>' +
            '</div>' +
            '<div class="navbar-collapse collapse">' +
              '<form class="navbar-form navbar-right">' +
                '<div class="form-group">' +
                  '<input type="text" placeholder="Email" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<input type="password" placeholder="Password" class="form-control">' +
                '</div>' +
                '<button type="submit" class="btn btn-success"></button>' +
              '</form>' +
            '</div>' +
          '</div>' +
          '<p>abc<i>a</i></p>' +
          '<p></p>' +
          '<h1></h1>' +
          '<h2 class="bogus"></h2>' +
          '<h3 class="bogus" id="test2"></h3>' +
          '<h4 class="new"></h4>' +
        '</div>'
      ;       

      var n = 
        '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
          '<div class="container">' +
            '<div class="navbar-header">' +
              '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">' +
                '<span class="icon-bar"></span>' +
              '</button>' +
              '<a class="navbar-brand" href="#">Project name!</a>' +
              '<ul></ul>' + 
            '</div>' +
            '<div class="navbar-collapse collapse">' +

            '</div>' +
          '</div>' +
          '<p></p>' +
        '</div>'
      ;       

      r = getRetrace(o);
      var start = new Date().getTime();

      r.parse(n).done(function(dom){
        r.compare().apply();
        var end = new Date().getTime();
        console.log(end - start);

        document.body.innerHTML.should.equal(n);
        done();
      });
    });

  
    it('creating major parts', function(done){
      
      var o = 
        '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
          '<div class="container">' +
            '<div class="navbar-header">' +
              '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">' +
                '<span class="icon-bar"></span>' +
              '</button>' +
              '<a class="navbar-brand" href="#">Project name!</a>' +
              '<ul></ul>' + 
            '</div>' +
            '<div class="navbar-collapse collapse">' +
            '</div>' +
          '</div>' +
          '<p></p>' +
        '</div>'
      ;       

      var n = 
        '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
          '<div class="container">' +
            '<div class="navbar-header">' +
              '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">' +
                '<span class="sr-only">Toggle navigation</span>' +
                '<span class="icon-bar"></span>' +
                '<span class="icon-bar"></span>' +
                '<span class="icon-bar"></span>' +
              '</button>' +
              '<a class="navbar-brand" href="#">Project name</a>' +
            '</div>' +
            '<section class="navbar-collapse collapse">' +
              '<form class="navbar-form navbar-right">' +

                '<div class="form-group">' +
                  '<input type="text" placeholder="Email" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<input type="password" placeholder="Password" class="form-control">' +
                '</div>' +
                '<button type="submit" class="btn btn-success"></button>' +

              '</form>' +
            '</section>' +
          '</div>' +
        '</div>'
      ;       

      r = getRetrace(o);
      var start = new Date().getTime();

      r.parse(n).done(function(dom){
        r.compare().apply();
        var end = new Date().getTime();
        console.log(end - start);

        //console.log(document.body.innerHTML.split('>').join('> \n'));

        document.body.innerHTML.should.equal(n);
        done();
      });
    });


    it('facilitate tag change', function(done){
      
      var o = 
        '<div>' +
          '<div>test</div>' +
        '</div>'
      ;       

      var n = 
        '<div>' +
          '<div><h1>Test</h1></div>' +
        '</div>'
      ;       

      r = getRetrace(o);
      var start = new Date().getTime();

      r.parse(n).done(function(dom){
        r.compare().apply();
        var end = new Date().getTime();
        console.log(end - start);

        document.body.innerHTML.should.equal(n);
        done();
      });
    });


    it('do several types', function(done){
      var o = 
        '<div>' +
          '<div>test</div>' +
        '</div>' +
        '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
          '<div class="container">' +
            '<div class="navbar-header">' +
              '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">' +
                '<span class="sr-only">Toggle navigation</span>' +
                '<span class="icon-bar"></span>' +
                '<span class="icon-bar"></span>' +
                '<span class="icon-bar"></span>' +
              '</button>' +
              '<a class="navbar-brand" href="#">Project name</a>' +
            '</div>' +
            '<div class="navbar-collapse collapse">' +
              '<form class="navbar-form navbar-right">' +
                '<div class="form-group">' +
                  '<input type="text" placeholder="Email" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  '<input type="password" placeholder="Password" class="form-control">' +
                '</div>' +
                '<button type="submit" class="btn btn-success"></button>' +
              '</form>' +
            '</div><!--/.navbar-collapse -->' +
          '</div>' +
          '<p>abc<i>a</i></p>' +
          '<p></p>' +
          '<h1></h1>' +
          '<h2 class="bogus"></h2>' +
          '<h3 class="bogus" id="test2"></h3>' +
          '<h4 class="new"></h4>' +
        '</div>'
      ;       

      var n = 
        '<div>' +
          '<div><h1>Test</h1></div>' + //This will force a type change of text, and  for a node to be added to an parent that does not exist on creation
        '</div>' +
        '<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">' +
          '<div class="container">' +
            '<div class="navbar-header">' +
              '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">' +
                //'<span class="sr-only">Toggle navigation</span>' + // <-- DELETE ONE: keep Children array
                '<span class="icon-bar"></span>' +
                // '<span class="icon-bar"></span>' + // <-- DELETE ONE: keep Children array
                '<span class="icon-bar"><i></i></span>' + // <-- while adding 
              '</button>' +
              '<a class="navbar-brand" href="#">Project name!</a>' +
              '<ul></ul>' + // <- ADD ONE: Use existing children array
            '</div>' +
            '<div class="navbar-collapse collapse">' +
              '<form class="navbar-form navbar-right">' +
                '<div class="form-group">' +
                  '<input type="text" placeholder="Email" class="form-control">' +
                '</div>' +
                '<div class="form-group">' +
                  // '<input type="password" placeholder="Password" class="form-control">' + // <-- DELETE ALL: remove Children array
                '</div>' +                
                '<button type="submit" class="btn btn-success"><em></em></button>' + //<- ADD ALL: children array
              '</form>' +
            '</div><!--/.navbar-collapse -->' +
          '</div>' +
          '<p></p>' + //<-- Removed ALL DATA
          '<p>test!</p>' + //<-- ALL New DATA
          '<h1 class="bogus"></h1>' +
          '<h2></h2>' + // <- Removed ALL Attribute
          '<h3 class="bogus"></h3>' + //Add all attributes
          '<h6 class="new" id="test"><p></p></h6>' + // <- RENAME: maintain attribs
          '<h4></h4>' +
        '</div>'
      ;       

      r = getRetrace(o);
      var start = new Date().getTime();

      r.parse(n).done(function(dom){
        r.compare().apply();
        var end = new Date().getTime();
        console.log(end - start);

        document.body.innerHTML.should.equal(n);
        done();
      });
    });

    it('facilitate from tag change', function(done){
      
      var o = 
        '<div>' +
          '<div><h1>Test</h1></div>' +
        '</div>'
      ;       

      var n = 
        '<div>' +
          '<div>test!</div>' +
        '</div>'
      ;       

      r = getRetrace(o);
      var start = new Date().getTime();

      r.parse(n).done(function(dom){
        r.compare().apply();
        var end = new Date().getTime();
        console.log(end - start);

        //console.log(document.body.innerHTML.split('>').join('> \n'));

        document.body.innerHTML.should.equal(n);
        done();
      });
    });


    it('facilitate from tag change', function(done){
      
      var o = 
        '<div>' +
          '<div><h1>Test</h1></div>' +
          '<!-- test comment -->' +
        '</div>'
      ;       

      var n = 
        '<div>' +
          '<div>test!</div>' +
          'test' +
        '</div>'
      ;       

      r = getRetrace(o);
      var start = new Date().getTime();

      r.parse(n).done(function(dom){
        r.compare().apply();
        var end = new Date().getTime();
        console.log(end - start);

        //console.log(document.body.innerHTML.split('>').join('> \n'));

        document.body.innerHTML.should.equal(n);
        done();
      });
    });

    it('facilitate from tag change reverse', function(done){

      var o = 
        '<div>' +
          '<div>test!</div>' +
          'test' +
        '</div>'
      ;      
      
      var n = 
        '<div>' +
          '<div><h1>Test</h1></div>' +
          '<!-- test comment -->' +
        '</div>'
      ;       

      r = getRetrace(o);
      var start = new Date().getTime();

      r.parse(n).done(function(dom){
        r.compare().apply();
        var end = new Date().getTime();
        console.log(end - start);

        //console.log(document.body.innerHTML.split('>').join('> \n'));

        document.body.innerHTML.should.equal(n);
        done();
      });
    });

    it('test identical', function(done){

      var o = 
        '<div>' +
          '<div>test!</div>' +
          'test' +
        '</div>'
      ;      
      
      var n = 
        '<div>' +
          '<div>test!</div>' +
          'test' +
        '</div>'
      ;      

      r = getRetrace(o);
      var start = new Date().getTime();

      r.parse(n).done(function(dom){
        r.compare().should.equal(false);
        done();
      });
    });

  });


});