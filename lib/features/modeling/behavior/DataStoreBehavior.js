import inherits from 'inherits';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is } from '../../../util/ModelUtil';
import { getMid } from 'diagram-js/lib/layout/LayoutUtil';


/**
 * BPMN specific create data store behavior
 */
export default function CreateDataStoreBehavior(
    elementRegistry, eventBus, bpmnFactory, moddle) {

  CommandInterceptor.call(this, eventBus);

  function findClosestParticipant(position) {
    var participants = elementRegistry
      .filter(function(element) {
        return is(element, 'bpmn:Participant');
      });

    var shortestDistance = getDistance(position, getMid(participants[0]));

    return participants.reduce(function(closestParticipant, participant) {
      var distance = getDistance(position, getMid(participant));

      if (distance < shortestDistance) {
        shortestDistance = distance;

        return participant;
      } else {
        return closestParticipant;
      }
    }, participants[0]);
  }


  this.preExecute('shape.create', function(event) {

    var context = event.context,
        shape = context.shape,
        parent = context.parent,
        position = context.position;

    if (is(shape, 'bpmn:DataStoreReference') &&
        shape.type !== 'label') {

      if (is(parent, 'bpmn:Collaboration')) {
        context.parent = findClosestParticipant(position);
      }

      if (!context.hints) {
        context.hints = {};
      }

      // prevent auto resizing
      context.hints.autoResize = false;
    }
  });


  this.preExecute('shape.move', function(event) {
    var context = event.context,
        delta = context.delta,
        newParent = context.newParent,
        shape = context.shape;

    if (is(shape, 'bpmn:DataStoreReference') && shape.type !== 'label') {

      if (is(newParent, 'bpmn:Collaboration')) {
        var mid = getMid(shape);

        var newPosition = {
          x: mid.x + delta.x,
          y: mid.y + delta.y
        };

        context.newParent = findClosestParticipant(newPosition);
      }
    }
  });


  this.preExecute('elements.move', function(event) {
    var context = event.context,
        shapes = context.shapes;

    var dataStoreReferences = shapes.filter(function(shape) {
      return is(shape, 'bpmn:DataStoreReference');
    });

    if (dataStoreReferences.length) {
      if (!context.hints) {
        context.hints = {};
      }

      // prevent auto resizing for data store references
      context.hints.autoResize = shapes.filter(function(shape) {
        return !is(shape, 'bpmn:DataStoreReference');
      });
    }
  });

}

CreateDataStoreBehavior.$inject = [
  'elementRegistry',
  'eventBus',
  'bpmnFactory',
  'moddle'
];

inherits(CreateDataStoreBehavior, CommandInterceptor);

// helpers //////////////////////

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}