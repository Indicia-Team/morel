//>>excludeStart("buildExclude", pragmas.buildExclude);
/*global m, define, */
define(['Occurrence', "Events"], function () {
//>>excludeEnd("buildExclude");
    /***********************************************************************
     * OCCURRENCES COLLECTION MODULE
     **********************************************************************/

    m.OccurrenceCollection = (function () {

        var Module = function (options) {
            var occurrence = null;
            this.occurrences = [];
            this.length = 0;

            if (options instanceof Array) {
                for (var i = 0; i < options.length; i++) {
                    occurrence = options[i];
                    if (occurrence instanceof morel.Occurrence) {
                        this.occurrences.push(occurrence);
                    } else {
                        //no option is provided for transformed keys without creating
                        //an Occurrence object. Eg. this is not possible:
                        //  new OccurrenceCollection([
                        //   {
                        //     id: 'xxxx'
                        //     attributes: {
                        //         taxon: 'xxxx'
                        //     }
                        //   }
                        // ])

                        //must be:

                        //  new OccurrenceCollection([
                        //   {
                        //     id: 'xxxx'
                        //     attributes: {
                        //         occurrence:taxon_taxon_list_id: 'xxxx'
                        //     }
                        //   }
                        // ])

                        //or:

                        //  new OccurrenceCollection([
                        //   new Occurrence({
                        //     id: 'xxxx'
                        //     attributes: {
                        //         taxon: 'xxxx'
                        //     }
                        //   })
                        // ])
                        m.extend(occurrence, {
                            plainAttributes: true
                        });
                        occurrence = new morel.Occurrence(occurrence);
                        this.occurrences.push(occurrence);
                    }
                    this.length++;
                }
            }
        };

        m.extend(Module.prototype, {
            Occurrence: m.Occurrence,

            add: function (items) {
                return this.set(items);
            },

            set: function (items) {
                var modified = [],
                    existing = null;
                //make an array if single object
                items = !(items instanceof Array) ? [items] : items;
                for (var i = 0; i < items.length; i++) {
                    //update existing ones
                    if (existing = this.get(items[i])) {
                        existing.attributes = items[i].attributes;
                    //add new
                    } else {
                        items[i].on('change', this._occurrenceEvent, this);

                        this.occurrences.push(items[i]);
                        this.length++;
                    }
                    modified.push(items[i]);
                }

                this.trigger('update');
                return modified;
            },

            /**
             *
             * @param occurrence occurrence or its ID
             * @returns {*}
             */
            get: function (item) {
                var id = item.id || item;
                for (var i = 0; i < this.occurrences.length; i++) {
                    if (this.occurrences[i].id == id) {
                        return this.occurrences[i];
                    }
                }
                return null;
            },

            getFirst: function () {
              return this.occurrences[0];
            },

            create: function () {
                var occurrence = new this.Occurrence();
                this.add(occurrence);
                return occurrence;
            },

            remove: function (items) {
                var items = !(items instanceof Array) ? [items] : items,
                    removed = [];
                for (var i = 0; i < items.length; i++) {
                    //check if exists
                    var current = this.get(items[i]);
                    if (!current) continue;

                    //get index
                    var index = -1;
                    for (var j = 0; index < this.occurrences.length; j++) {
                        if (this.occurrences[j].id === current.id) {
                            index = j;
                            break;
                        }
                    }
                    if (j > -1) {
                        this.occurrences.splice(index, 1);
                        this.length--;
                        removed.push(current);
                    }
                }
                this.trigger('update');
                return removed;
            },

            has: function (item) {
                var data = this.get(item);
                return data !== undefined && data !== null;
            },

            size: function () {
                return this.occurrences.length;
            },

            toJSON: function () {
                var json = [];
                for (var i = 0; i < this.occurrences.length; i++) {
                    json.push(this.occurrences[i].toJSON());
                }

                return json;
            },

            _occurrenceEvent: function () {
                this.trigger('change');
            }
        });

        m.extend(Module.prototype, m.Events);

        return Module;
    }());
//>>excludeStart("buildExclude", pragmas.buildExclude);
});
//>>excludeEnd("buildExclude");