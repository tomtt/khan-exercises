$.extend(KhanUtil, {
	// Creates a function which is defined in the problem, like
	// f(x) = 2x + 4
	// User uses the named function definitions to find the value of
	// the question function

	// variable: string, name of the input variable
	// name: string, name that will be given to the generated function
	NamedFunction: function(variable, name) {
		var c = {};
		c.generator = KhanUtil.NamedFunction;

		c.variable = variable;
		c.name = name;

		c.sqCoef = 0;
		c.cuCoef = 0;
		c.linCoef = 1;
		c.consCoef = 0;

		if (KhanUtil.rand(1)) {
			c.sqCoef = KhanUtil.randRange(-3, 3);
		} else if (KhanUtil.randRange(-3, 1) > 0) {
			c.cuCoef = KhanUtil.randRange(-2, 2);
		}

		if (KhanUtil.rand(1)) {
			c.linCoef = KhanUtil.randRangeNonZero(-5, 5);
		}

		if (KhanUtil.rand(1)) {
			c.consCoef = KhanUtil.randRange(-5, 5);
		}

		if (KhanUtil.randRange(-2, 1) > 0 &&
			(c.sqCoef != 0 || c.cuCoef != 0 || c.consCoef != 0)) {
			// small chance of having no linear term if we have some other term
			c.linCoef = 0;
		}

		c.of = function(x) {
			return c.sqCoef*x*x + c.cuCoef*x*x*x + c.linCoef*x + c.consCoef;
		};

		c.textOf = function(variable) {
			var text = '';
			
			if (c.sqCoef != 0) {
				text += formatFirstCoefficient(c.sqCoef)+'('+variable+')^2';
			} else if (c.cuCoef != 0) {
				text += formatFirstCoefficient(c.cuCoef)+'('+variable+')^3';
			}

			if (c.linCoef != 0) {
				text += (text.length > 0 ?
						 formatCoefficient(c.linCoef) :
						 formatFirstCoefficient(c.linCoef)
						);
				text += ' '; // so we don't get an awkward +- combo
				if (c.linCoef != 1 && c.linCoef != -1) {
					text += '*'+variable;
				} else {
					// no visible coefficient (= 1 or -1)
					text += variable;
				}
			}

			if (c.consCoef != 0) {
				text += (text.length > 0 ?
						 formatConstant(c.consCoef) :
						 c.consCoef
						);
			}
			return text;
		};

		c.writeHint = function(x) {
			writeStep('`'+c.name+'('+x+') = '+c.textOf(x)+'`');
			writeStep('`'+c.name+'('+x+') = '+c.of(x)+'`');
		};

		c.text = c.textOf(variable, name);

		return c;
	},

	// Composited is another defined function -- like
	// g(x) = 2 + f(x + 1)
	// It's like a NamedFunction but may contain other functions
    NamedCompositeFunction: function(variable, name, func) {
		var c = {};
		c.generator = KhanUtil.NamedCompositeFunction;

		// call parent constructor, set up the non-composite part
		// TODO figure out how to use prototypal inheritance;
		// honestly I tried and couldn't find a cleaner solution than c
		c.parent = new KhanUtil.NamedFunction(variable, name);

		c.variable = variable;
		c.name = name;
		
		// func: function to embed in c function
		c.func = func;

		// NCF is a separate type from NamedFunction to avoid unsolvable cycles of functions

		// TODO increase variance and complexity of named composite functions
		// - Allow composed functions to be in different places (vary the term order)
		// - Allow multiple composed functions in one NamedCompositeFunction
		c.funcCoef = KhanUtil.randRange(1, 3);
		c.funcAdd = (KhanUtil.rand(1) ?
					 KhanUtil.randRange(-5, 5) :
					 0);

		c.textOf = function(variable) {
			var text = c.parent.textOf(variable);
			if (text == '0') {
				text = formatFirstCoefficient(c.funcCoef) +
					c.func.name+'('+variable+formatConstant(c.funcAdd)+')';
			} else {
				text += formatCoefficient(c.funcCoef) +
					c.func.name+'('+variable+formatConstant(c.funcAdd)+')';
			}
			
			return text;
		};
		c.of = function(x) {
			return c.parent.of(x) +
				c.funcCoef*c.func.of(x + c.funcAdd);
		};
		c.solvedInnerTextOf = function(x) {
			// textOf but with +13 instead of +f(x+3), for example
			var text = c.parent.textOf(x);
			if (text == '0') {
				text = formatFirstCoefficient(c.funcCoef) +
					'*'+c.func.of(x+c.funcAdd);
			} else {
				text += formatCoefficient(c.funcCoef) +
					'*'+c.func.of(x+c.funcAdd);
			}
			
			return text;
		};
		
		c.writeHint = function(x) {
			writeStep('`'+c.name+'('+x+') = '+c.textOf(x)+'`');
			writeStep('To solve for the value of `'+c.name+
					  '`, we need to solve for the value of `'+
					  c.func.name+'('+x+formatConstant(c.funcAdd)+')`.');
			c.func.writeHint(x+c.funcAdd);
			writeStep('Okay, so `'+
					  c.func.name+'('+x+formatConstant(c.funcAdd)+') = '+c.func.of(x+c.funcAdd)+'`. '+
					  'That means `'+c.name+'('+x+') = '+c.solvedInnerTextOf(x)+'`.');
			writeStep('`'+c.name+'('+x+') = '+c.of(x)+'`');	    
		};

		c.text = c.textOf(variable, name);
		
		return c;
    },

    ProblemInnerExpression: function(func, x) {
		var c = {};
		c.generator = KhanUtil.ProblemInnerExpression;
		
		// Generates an inner expression the user must solve for
		// Example: f(7), where func is f and x = 7
		
		var funcAdd = (KhanUtil.rand(1) ?
					   KhanUtil.randRange(-5, 5) :
					   0);
		c.func = func;
		
		c.text = c.func.name+'('+x+formatConstant(funcAdd)+')';
		c.x = x+funcAdd;

		c.writeHint = function() {
			c.func.writeHint(c.x);
		};

		c.answer = function() {
			return func.of(c.x);
		};

		return c;
    },

    ProblemOuterExpression: function(func, exp) {
		var c = {};
		c.generator = KhanUtil.ProblemOuterExpression;

		// Generates an outer expression around a string the user must solve for
		// Example: g(exp),
		// where exp is a ProblemInnerExpression [ex. f(7)]

		// You could also chain outer expressions together..
		c.func = func;
		c.exp = exp;
		c.text = func.name+'('+exp.text+')';
		c.x = exp.answer();

		c.writeHint = function() {
			writeStep('First, let\'s solve for the value of the inner function, `'+exp.text+
					  '`. Then we\'ll know what to plug into the outer function.');
			exp.writeHint();
			writeStep('Now we know that `'+exp.text+' = '+exp.answer()+'`. '+
					  'Let\'s solve for `'+c.text+'`, which is `'+c.func.name+'('+c.x+')`.');
			func.writeHint(c.x);
		};

		c.answer = function() {
			return func.of(c.x);
		};

		return c;
    },


    init: function() {

		var baseFunc = new this.NamedFunction(
			randomMember(this.X_NAMES), randomMember(this.FUNC_NAMES));
		var functions = {};
		
		functions[baseFunc.name] = baseFunc; //= {baseFunc.name: baseFunc};
		var funcNames = [baseFunc.name];

		var name;
		for (var i = 1; i < numFuncs; i++) {
			do {
				name = randomMember(this.FUNC_NAMES);
			} while ($.inArray(name, funcNames) != -1);

			functions[name] = new this.NamedCompositeFunction(
				randomMember(this.X_NAMES),
				name,
				functions[randomMember(funcNames)]);
			funcNames.push(name);
		}

		funcNames.sort();

		// Print out the function definitions
		var func;
		$.each(funcNames, function(index, value) {
			func = functions[value];
			writeText('`'+func.name+'('+func.variable+') = '+func.text+'`');
	    });

		do {
			var innerFunc = functions[randomMember(funcNames)];
			var outerFunc = functions[randomMember(funcNames)];
			// Ensure that the student has to solve a composite function problem
			// and that they aren't solving f(f(x)) -- perfectly okay in moderation,
			// but not preferred for now
		} while (!(innerFunc.generator == KhanUtil.NamedCompositeFunction ||
				   outerFunc.generator == KhanUtil.NamedCompositeFunction)
				 || innerFunc == outerFunc);

		// Construct and write the actual problem
		var problem = new this.ProblemOuterExpression(
			outerFunc,
			new this.ProblemInnerExpression(
				innerFunc, KhanUtil.randRange(-10, 10)));
		writeText('`' + problem.text + ' = ?`');
		problem.writeHint();

		setCorrectAnswer(problem.answer());
    }
});