ace.provide("ace.Search");

ace.Search = function() {
    this.$options = {
        needle: "",
        backwards: false,
        wrap: false,
        caseSensitive: false,
        wholeWord: false,
        scope: ace.Search.ALL
    };
};

ace.Search.ALL = 1;
ace.Search.SELECTION = 2;

(function() {

    this.set = function(options) {
        ace.mixin(this.$options, options);
        return this;
    };

    this.find = function(doc) {
        var needle = this.$options.needle;
        if (!this.$options.needle)
            return null;

        if (this.$options.backwards) {
            var iterator = this.$backwardMatchIterator(doc);
        } else {
            var iterator = this.$forwardMatchIterator(doc);
        }

        var firstRange = null;
        iterator.forEach(function(range) {
            firstRange = range;
            return true;
        });

        return firstRange;
    };

    this.findAll = function(doc) {
        var needle = this.$options.needle;
        if (!this.$options.needle)
            return [];

        if (this.$options.backwards) {
            var iterator = this.$backwardMatchIterator(doc);
        } else {
            var iterator = this.$forwardMatchIterator(doc);
        }

        var ranges = [];
        iterator.forEach(function(range) {
            ranges.push(range);
        });

        return ranges;
    };

    this.$forwardMatchIterator = function(doc) {
        var re = this.$assembleRegExp();
        var self = this;

        return {
            forEach: function(callback) {
                self.$forwardLineIterator(doc).forEach(function(line, startIndex, row) {
                    if (startIndex) {
                        line = line.substring(startIndex);
                    }

                    var matches = [];

                    line.replace(re, function(str, offset) {
                        matches.push({
                            str: str,
                            offset: startIndex + offset
                        });
                        return str;
                    });

                    for (var i=0; i<matches.length; i++) {
                        var match = matches[i];
                        var range = self.$rangeFromMatch(row, match.offset, match.str.length);
                        if (callback(range))
                            return true;
                    }

                });
            }
        };
    };

    this.$backwardMatchIterator = function(doc) {
        var re = this.$assembleRegExp();
        var self = this;

        return {
            forEach: function(callback) {
                self.$backwardLineIterator(doc).forEach(function(line, startIndex, row) {
                    if (startIndex) {
                        line = line.substring(startIndex);
                    }

                    var matches = [];

                    line.replace(re, function(str, offset) {
                        matches.push({
                            str: str,
                            offset: startIndex + offset
                        });
                        return str;
                    });

                    for (var i=matches.length-1; i>= 0; i--) {
                        var match = matches[i];
                        var range = self.$rangeFromMatch(row, match.offset, match.str.length);
                        if (callback(range))
                            return true;
                    }
                });
            }
        };
    };



    this.$rangeFromMatch = function(row, column, length) {
        var range = {
            start: {
                row: row,
                column: column
            },
            end: {
                row: row,
                column: column + length
            }
        };
        return range;
    };

    this.$assembleRegExp = function() {
        if (this.$options.regExp) {
            var needle = this.$options.needle;
        } else {
            var needle = ace.escapeRegExp(this.$options.needle);
        }

        if (this.$options.wholeWord) {
            needle = "\\b" + needle + "\\b";
        }

        var modifier = "g";
        if (this.$options.caseSensitive) {
            modifier += "i";
        }

        var re = new RegExp(needle, modifier);
        return re;
    };

    this.$forwardLineIterator = function(doc) {
        var searchSelection = this.$options.scope == ace.Search.SELECTION;

        var range = doc.getSelection().getRange();
        var start = doc.getSelection().getCursor();

        var firstRow = searchSelection ? range.start.row : 0;
        var firstColumn = searchSelection ? range.start.column : 0;
        var lastRow = searchSelection ? range.end.row : doc.getLength() - 1;

        var wrap = this.$options.wrap;

        function getLine(row) {
            var line = doc.getLine(row);
            if (searchSelection && row == range.end.row) {
                line = line.substring(0, range.end.column);
            }
            return line;
        }

        return {
            forEach: function(callback) {
                var row = start.row;

                var line = getLine(row);
                startIndex = start.column;

                var stop = false;

                while (!callback(line, startIndex, row)) {

                    if (stop) {
                        return;
                    }

                    row++;
                    startIndex = 0;

                    if (row > lastRow) {
                        if (wrap) {
                            row = firstRow;
                            startIndex = firstColumn;
                        } else {
                            return;
                        }
                    }

                    if (row == start.row)
                        stop = true;

                    var line = getLine(row);
                }
            }
        };
    };

    this.$backwardLineIterator = function(doc) {
        var searchSelection = this.$options.scope == ace.Search.SELECTION;

        var range = doc.getSelection().getRange();
        var start = searchSelection ? range.end : range.start;

        var firstRow = searchSelection ? range.start.row : 0;
        var firstColumn = searchSelection ? range.start.column : 0;
        var lastRow = searchSelection ? range.end.row : doc.getLength() - 1;

        var wrap = this.$options.wrap;

        return {
            forEach : function(callback) {
                var row = start.row;

                var line = doc.getLine(row).substring(0, start.column);
                var startIndex = 0;
                var stop = false;

                while (!callback(line, startIndex, row)) {

                    if (stop)
                        return;

                    row--;
                    var startIndex = 0;

                    if (row < firstRow) {
                        if (wrap) {
                            row = lastRow;
                        } else {
                            return;
                        }
                    }

                    if (row == start.row)
                        stop = true;

                    line = doc.getLine(row);
                    if (searchSelection) {
                        if (row == firstRow)
                            startIndex = firstColumn;
                        else if (row == lastRow)
                            line = line.substring(0, range.end.column);
                    }
                }
            }
        };
    };

}).call(ace.Search.prototype);